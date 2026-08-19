# Relatório Técnico — Engine Resiliente de Automações

Este documento explica **como o sistema funciona**, **por que ele foi construído dessa forma**
e **quais gargalos reais apareceram** durante o desenvolvimento. O README cobre "como rodar";
este arquivo cobre "como pensar sobre o que foi rodado".

---

## 1. Visão geral

O sistema resolve um problema concreto: cadastrar candidatos e notificar um serviço externo
sobre cada cadastro, sabendo de antemão que esse serviço externo **vai falhar** (o enunciado
pede simulação de `500` e `429`). O projeto inteiro gira em torno de uma pergunta: *como
garantir que uma falha de terceiros nunca vire perda de dado nem trave a experiência de quem
está usando o formulário?*

A resposta tem três pernas:

1. **Nunca bloquear a requisição HTTP** com trabalho que pode demorar ou falhar.
2. **Tratar falha como estado, não como exceção** — todo cadastro nasce `PENDENTE` e evolui
   através de estados explícitos (`PROCESSANDO`, `SUCESSO`, `FALHA`), nunca "desaparece".
3. **Dar ao usuário controle** quando o sistema desiste (reprocessamento manual).

## 2. Arquitetura

**Monólito Modular + BFF** (Backend-For-Frontend):

```
backend/
  src/
    config/env.ts              → única fonte de verdade de configuração, validada com Zod
    modules/
      candidates/               → domínio "candidato" (rotas, controller, service, repository)
      automation/                → domínio "automação" (fila, retry, webhook simulado)
    shared/
      errors/                   → AppError + errorHandler central
      http/                     → asyncHandler, rate limiters
      database/                 → cliente Prisma singleton

frontend/
  src/
    features/candidates/        → formulário, dashboard, histórico de tentativas, hook de dados
    components/                 → Toast e Skeleton — genéricos, sem conhecimento do domínio
    services/api/               → cliente HTTP tipado + mapeamento de erros
    types/                      → contratos compartilhados com o backend
```

**Por quê monólito e não microsserviços?** O domínio é pequeno (dois agregados: candidato e
tentativa de automação) e o prazo era de 24h. Microsserviços introduziriam rede, deploy e
observabilidade distribuída sem nenhum ganho real nessa escala — só risco. Modularizar por
domínio dentro de um único processo dá 90% do benefício de "separação de responsabilidades"
com 10% do custo operacional.

**Por que BFF?** O frontend nunca fala com o banco nem conhece detalhes de implementação da
automação (fila, retries). Ele só enxerga `GET /candidates`, `POST /candidates` e
`POST /candidates/:id/reprocess` — um contrato pequeno e estável, desenhado para as telas que
existem, não um CRUD genérico exposto cru.

## 3. O fluxo, passo a passo

```
POST /candidates
   │
   ├─► valida com Zod (candidate.schema.ts)
   ├─► verifica e-mail único (candidateRepository.findByEmail)
   ├─► grava no SQLite com status "PENDENTE"
   ├─► automationQueue.enqueue(id)   ← dispara e ESQUECE (não faz await)
   └─► responde 201 imediatamente    ← candidato ainda está PENDENTE aqui

   [em paralelo, fora do ciclo da requisição]
   automationQueue → automationService.process(id)
      ├─► status vira "PROCESSANDO"
      ├─► tentativa 1: webhookSimulator.notify()
      │      50% de chance de sucesso (configurável); falha = 429 ou 500 aleatório
      ├─► se falhar: registra a tentativa (automation_attempts) e espera
      │      delay = AUTOMATION_BASE_DELAY_MS × 2^(tentativa-1) + jitter aleatório
      ├─► tentativa 2, tentativa 3...
      └─► após AUTOMATION_MAX_RETRIES falhas: status vira "FALHA" (definitivo, mas reversível)

POST /candidates/:id/reprocess
      ├─► só aceito se status atual == "FALHA" (validado no backend, não só na UI)
      └─► reabre o ciclo: PROCESSANDO → tentativas → SUCESSO ou FALHA de novo

GET /candidates/:id/attempts
      └─► lista cada tentativa já registrada (número, sucesso/falha, código HTTP,
          mensagem de erro, horário) — a auditoria que o retry já gravava, agora visível
```

O ponto crítico técnico é o `automationQueue.enqueue()`
([automationQueue.ts](backend/src/modules/automation/automationQueue.ts)): ele usa
`setImmediate()` para agendar o processamento no próximo tick do event loop, **sem** `await`.
Isso significa que a função que atende o `POST /candidates` retorna a resposta HTTP antes de
qualquer chamada ao "webhook" acontecer — testei isso na prática e o tempo de resposta do
cadastro fica em torno de **15-20ms**, independente de quantas tentativas de retry o candidato
vai levar depois (que podem somar segundos).

### Retry com exponential backoff + jitter

```
delay = AUTOMATION_BASE_DELAY_MS × 2^(tentativa − 1) + random(0, AUTOMATION_BASE_DELAY_MS)
```

Duas decisões deliberadas:

- **Backoff exponencial** (não linear): se o serviço externo está sofrendo rate limit (`429`),
  insistir no mesmo ritmo só piora — cada falha aumenta o intervalo até a próxima tentativa.
- **Jitter aleatório**: sem ele, se vários candidatos falharem juntos, todos tentariam de novo
  exatamente no mesmo instante, criando um pico sincronizado (o efeito manada / *thundering
  herd*). O ruído aleatório espalha as tentativas no tempo.

### Por que fila em memória, e não Redis/BullMQ/SQS?

Porque o escopo é uma API single-instance rodando em SQLite — introduzir uma fila distribuída
seria over-engineering para o problema real. A interface `AutomationQueue` foi desenhada de
propósito para isso: é uma abstração de uma linha (`enqueue(id)`) que qualquer implementação
real (BullMQ, SQS) poderia substituir sem tocar em `automationService.ts`. **Trade-off
assumido conscientemente**: se o processo reiniciar com jobs em andamento na memória, esses
jobs são perdidos (o candidato fica "preso" em `PROCESSANDO`). Em produção isso pediria uma
fila persistida; documentado aqui como limitação conhecida, não como bug.

## 4. Por que a tipagem estrita importa (e não é só burocracia)

Os dois `tsconfig.json` (backend e frontend) ligam `strict`, `noUncheckedIndexedAccess` e
`exactOptionalPropertyTypes`. Isso não é só para satisfazer o critério "evitar `any`" — pegou
**um bug real** durante o desenvolvimento: o cliente HTTP do frontend
([httpClient.ts](frontend/src/services/api/httpClient.ts)) originalmente montava
`{ body: options.body !== undefined ? JSON.stringify(...) : undefined }` — com
`exactOptionalPropertyTypes` ligado, o compilador recusou porque o tipo `RequestInit.body` do
DOM não aceita `undefined` explícito (só aceita a chave ausente). Sem essa flag, esse código
compilaria e o bug só apareceria em runtime, silenciosamente, na primeira requisição GET.

## 5. Segurança

- **Zod nas duas pontas**: o mesmo schema de validação (nome, e-mail, cargo, URL do LinkedIn)
  existe no backend (fonte da verdade) e é espelhado no frontend (feedback instantâneo, sem
  round-trip). O backend nunca confia no frontend — reprocessar um candidato que não está em
  `FALHA`, por exemplo, é bloqueado na `service layer`, não só desabilitando o botão.
- **Helmet**: cabeçalhos HTTP padrão de segurança (evita, por exemplo, que o navegador tente
  adivinhar o `Content-Type` de uma resposta).
- **Rate limiting diferenciado por rota**: escrita (`POST`) em 10 req/min, leitura (`GET`,
  usada pelo polling do dashboard) em 60 req/min. Testei isso derrubando o limite de propósito
  (25 cadastros em rajada) e a UI reagiu ao `429` de forma limpa — reverteu o estado otimista
  e mostrou o erro na linha certa, sem travar a tela.

## 6. Frontend: as decisões que sustentam "tempo real"

- **Polling, não WebSocket**: a cada 4s o dashboard busca `GET /candidates` de novo. Escolha
  deliberada pela simplicidade e pelo escopo (não haveria tempo de justificar a complexidade
  de um servidor de WebSocket num desafio de 24h) — o enunciado pede "tempo real" na
  experiência do usuário, não uma arquitetura de streaming.
- **Atualização otimista com rollback**: ao clicar em "Reprocessar", a linha muda para
  `PROCESSANDO` imediatamente (sem esperar a resposta da API) e, se a chamada falhar (ex.:
  rate limit), o hook `useCandidates` refaz o `refresh()` para voltar ao estado real do
  servidor. Isso evita a sensação de "trava" na interação sem mentir sobre o estado real.
- **`ApiError` tipado**: o frontend nunca trata erro de API como string solta — ele carrega
  `status`, `code` (o `error` que o backend manda, ex. `"ConflictError"`) e `message`. Isso
  permite tratamento cirúrgico: e-mail duplicado vira erro *no campo* E-mail, em vez de um
  alerta genérico no topo da tela.

## 7. Design e enriquecimento da interface

O visual passou por duas rodadas: primeiro um redesign completo (tema "painel de operações" —
paleta neutra fria + accent teal, IBM Plex Sans + JetBrains Mono, suporte nativo a claro/escuro
via `prefers-color-scheme`, sem depender de nenhuma dependência de UI). Depois, três
enriquecimentos foram adicionados especificamente para dar mais profundidade ao dashboard sem
inflar escopo:

- **Histórico de tentativas expansível**: clicar no nome do candidato revela, inline na
  própria tabela, cada tentativa registrada pelo retry (seção 3) — transforma o dashboard de
  "lista de status" em um log de operações de verdade. Foi a peça mais substancial das três
  porque usa dado que o backend **já gravava** e nunca tinha rota nem UI.
- **Skeleton loading**: linhas com efeito "shimmer" ([Skeleton.tsx](frontend/src/components/Skeleton.tsx))
  no carregamento inicial, evitando o salto de layout de um texto "Carregando..." sumindo de
  repente. Só aparece na primeira carga — o polling em segundo plano (a cada 4s) não re-mostra
  o skeleton, senão a tela "piscaria" a cada atualização.
- **Toast de confirmação**: substituiu o parágrafo estático de sucesso do formulário por um
  componente [Toast.tsx](frontend/src/components/Toast.tsx) reutilizável, com auto-dismiss e
  fechamento manual — sinaliza "isso aconteceu agora" melhor do que texto que fica preso na
  tela até o próximo submit.

## 8. Docker

Multi-stage build nos dois serviços (`deps` → `build` → `prod-deps`/`runtime`), rodando como
usuário não-root, com o SQLite persistido num volume nomeado. O frontend é servido em produção
por Nginx (não `vite dev`) com fallback de SPA.

## 9. Gargalos reais enfrentados (e como foram resolvidos)

Esta seção documenta problemas que **realmente aconteceram** durante a construção, não
hipóteses — cada um custou tempo de investigação real.

### 9.1 Prisma + Alpine + OpenSSL

**Sintoma:** o container do backend buildava, mas o Prisma Client falhava em runtime com
`PrismaClientInitializationError: could not locate the Query Engine`.
**Causa raiz:** a imagem base `node:20-alpine` usa `musl` em vez de `glibc`; os engines
nativos do Prisma são compilados para `glibc`, e o Alpine não tem OpenSSL instalado por
padrão, então o `prisma generate` gerava um engine para uma versão de OpenSSL que não batia
com a do container final.
**Correção:** trocar a base para `node:20-slim` (Debian) e instalar `openssl` explicitamente
**antes** de rodar `prisma generate` no estágio que gera o client de produção — a ordem importa,
porque é nesse momento que o Prisma detecta qual engine baixar.

### 9.2 `prisma` CLI ausente na imagem de produção

**Sintoma:** com o Alpine já trocado, o container ainda falhava — `Error: Can't write to
/app/node_modules/@prisma/engines`, um erro de permissão.
**Causa raiz:** o comando de start (`npx prisma migrate deploy`) precisa do pacote `prisma`
(o CLI), mas ele estava em `devDependencies` e a imagem de produção roda `npm ci --omit=dev`.
Sem o pacote instalado, `npx` tentava *baixá-lo na hora*, como usuário não-root, sem permissão
de escrita em `node_modules`.
**Correção:** mover `prisma` para `dependencies` — é um caso legítimo de CLI que precisa
existir em produção, não só em desenvolvimento.

### 9.3 BuildKit + OneDrive (bug de ambiente, não de código)

**Sintoma:** `docker compose build` falhava com `invalid file request .env.example`, de forma
consistente e determinística.
**Causa raiz:** o projeto vive dentro de uma pasta sincronizada pelo OneDrive no Windows. O
recurso "Files On-Demand" do OneDrive usa *reparse points* do NTFS mesmo em arquivos já
baixados localmente, e o BuildKit (o builder padrão do Docker) não lida bem com esse atributo
ao montar o contexto de build.
**Correção:** usar o builder clássico (`DOCKER_BUILDKIT=0`) como workaround — documentado no
README como nota de troubleshooting, já que reaparece em qualquer build feito dentro dessa
pasta.

### 9.4 `import.meta.env` tipado como `any` por padrão

**Sintoma:** nada quebrava em build, mas `VITE_API_BASE_URL` estava implicitamente `any`,
violando o critério "zero `any`" mesmo sem nenhum `any` escrito à mão.
**Causa raiz:** o template padrão do Vite declara `ImportMetaEnv` com um índice de fallback
`Record<string, any>` a menos que o projeto opte explicitamente por `strictImportMetaEnv`.
**Correção:** [vite-env.d.ts](frontend/src/vite-env.d.ts) declarando `ViteTypeOptions` com
`strictImportMetaEnv: unknown` e tipando `VITE_API_BASE_URL` como `string` — remove o índice
de fallback e força erro de compilação se a variável não existir.

### 9.5 Rate limiter pego pelo próprio teste

Não foi bem um "problema" — foi uma validação inesperada. Ao criar ~25 candidatos em rajada
para forçar estatisticamente um caso de `FALHA` (a taxa de sucesso do webhook simulado é 50%,
então a chance de um candidato falhar nas 3 tentativas é baixa), o próprio limite de escrita
(10 req/min) bloqueou parte das requisições — e, ao clicar em "Reprocessar" logo em seguida,
esse clique também tomou `429`. A interface reagiu corretamente (reverteu o estado otimista,
mostrou o erro na linha certa), o que acabou sendo a melhor prova possível de que o rate
limiting e o tratamento de erro do frontend funcionam *juntos*, sob condição real de estresse.

### 9.6 Mensagem de commit de merge poluída pelo template do Git

Ao concluir um `git commit` depois de um merge com conflitos já resolvidos manualmente, o
commit saiu com o corpo inteiro do template padrão do Git colado na mensagem (as linhas `#
Please enter a commit message...`) em vez de só o texto real. Sintoma de que os comentários do
`MERGE_MSG` não foram removidos automaticamente nesse fluxo específico (provavelmente por causa
de como o editor integrado da IDE gravou o arquivo). Como o commit ainda não tinha sido
enviado ao GitHub, a correção foi simples: `git commit --amend -m "..."` com a mensagem limpa.
Fica registrado porque é o tipo de detalhe fácil de deixar passar — vale sempre conferir
`git log -1 --pretty=%B` depois de um merge assistido por IDE.

## 10. Limitações conhecidas (assumidas, não escondidas)

- **Fila em memória**: jobs de automação em andamento se perdem se o processo reiniciar (ver
  seção 3). Aceitável no escopo do desafio; documentado como próximo passo para produção.
- **`npm run lint` do backend está quebrado**: o script chama `eslint`, mas o pacote nunca foi
  adicionado como devDependency. Não afeta a aplicação (roda só localmente, fora do build/CI),
  mas é uma inconsistência real que ficou de fora do escopo corrigido nesta rodada.
- **Sem suíte de testes automatizados**: toda validação nesta sessão foi feita rodando a
  aplicação de verdade (curl, Playwright contra o app real) — não existe `*.test.ts` no
  repositório, incluindo a rota nova `GET /candidates/:id/attempts`. Funciona como prova de
  que o sistema se comporta corretamente, mas não substitui testes versionados que rodariam
  em CI.
