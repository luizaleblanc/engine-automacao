<img width="1917" height="1136" alt="image" src="https://github.com/user-attachments/assets/53cdff50-6ba0-4893-8e4f-0b4ffa2e70ce" />

# Engine Resiliente de Automações

Sistema de cadastro de candidatos com disparo assíncrono de automações, resiliente a falhas
(retry com exponential backoff), dashboard em tempo real e reprocessamento manual.

Construído como um **Monólito Modular** com padrão **BFF** (Backend-For-Frontend): o backend
expõe só o que o dashboard precisa, cada domínio (`candidates`, `automation`) é isolado em seu
próprio módulo, e o disparo da automação nunca bloqueia a resposta HTTP do cadastro.

## Stack

| Camada | Tecnologias |
|---|---|
| Backend | Node.js, TypeScript, Express, Prisma ORM, SQLite, Zod, Helmet, express-rate-limit |
| Frontend | React 19, TypeScript, Vite, Zod |
| Infra | Docker, Docker Compose, Nginx (serve o build do frontend em produção) |

## Estrutura

```
backend/    API REST (cadastro, listagem, reprocessamento, engine de retry)
frontend/   Formulário + dashboard em tempo real (React + TS)
```

## Como o sistema garante resiliência

- **Disparo não bloqueante**: ao cadastrar um candidato, a automação é enfileirada em memória
  (`automationQueue.enqueue`) e processada fora do ciclo da requisição HTTP — o `POST /candidates`
  responde imediatamente com o candidato em status `PENDENTE`.
- **Simulação de instabilidade**: o webhook externo é simulado com uma taxa de sucesso
  configurável (`WEBHOOK_SUCCESS_RATE`); as falhas alternam entre `429 Too Many Requests` e
  `500 Internal Server Error`.
- **Retry com exponential backoff + jitter**: cada tentativa falha aguarda
  `AUTOMATION_BASE_DELAY_MS * 2^(tentativa-1)` mais um ruído aleatório antes da próxima, até
  `AUTOMATION_MAX_RETRIES` tentativas. Só então o status vira `FALHA`. Cada tentativa (sucesso ou
  falha, com código HTTP e mensagem) fica registrada em `automation_attempts` para auditoria.
- **Reprocessamento manual**: `POST /candidates/:id/reprocess` só é aceito para candidatos em
  `FALHA` (regra validada no backend, não só desabilitada na UI).
- **Rate limiting por rota**: escrita (cadastro/reprocessamento) limitada a 10 req/min, leitura
  (listagem, usada pelo polling do dashboard) a 60 req/min — protege o sistema de abuso sem
  travar o uso legítimo.
- **Tipagem estrita**: `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` em
  ambos os projetos, zero uso de `any`.

## Pré-requisitos

- Node.js 20+
- Docker + Docker Compose (opcional, para rodar a stack inteira com um comando)

## Rodando localmente (sem Docker)

### 1. Backend

```powershell
cd backend
copy .env.example .env
npm install
npm run prisma:migrate
npm run dev
```

API sobe em `http://localhost:3333`. Endpoints:

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Healthcheck |
| `POST` | `/candidates` | Cadastra candidato e dispara a automação |
| `GET` | `/candidates` | Lista candidatos e status das automações |
| `POST` | `/candidates/:id/reprocess` | Reprocessa manualmente um candidato em `FALHA` |

### 2. Frontend

Em outro terminal:

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

Dashboard sobe em `http://localhost:5173`.

## Rodando a stack inteira via Docker

```powershell
docker compose up --build
```

Sobe **backend** (`http://localhost:3333`) e **frontend** (`http://localhost:5173`, servido via
Nginx a partir do build de produção do Vite). As migrations do Prisma são aplicadas
automaticamente ao subir o backend, e o SQLite fica num volume nomeado (`backend-data`),
persistindo entre rebuilds do container.

Variáveis de ambiente podem ser sobrescritas antes do comando (ex.:
`$env:WEBHOOK_SUCCESS_RATE=0.2`) ou via um arquivo `.env` na raiz do projeto (lido
automaticamente pelo Docker Compose). Note que `VITE_API_BASE_URL` é embutida no bundle do
frontend em **build-time** (é código client-side) — se mudar essa variável, rode
`docker compose up --build` de novo para refletir a mudança.

> **Nota (Windows + OneDrive):** se o projeto estiver dentro de uma pasta sincronizada pelo
> OneDrive, o builder padrão do Docker (BuildKit) pode falhar com `invalid file request` por
> causa de como o OneDrive Files-On-Demand usa reparse points. Se isso acontecer, use o builder
> clássico: `$env:DOCKER_BUILDKIT=0; docker compose up --build`.

## Variáveis de ambiente

### `backend/.env`

| Variável | Descrição | Default |
|---|---|---|
| `NODE_ENV` | Ambiente de execução | `development` |
| `PORT` | Porta HTTP da API | `3333` |
| `DATABASE_URL` | Connection string do SQLite | `file:./dev.db` |
| `CORS_ORIGIN` | Origem permitida pelo CORS (URL do frontend) | `http://localhost:5173` |
| `WEBHOOK_SUCCESS_RATE` | Probabilidade (0–1) de sucesso do webhook simulado | `0.5` |
| `WEBHOOK_MIN_LATENCY_MS` / `WEBHOOK_MAX_LATENCY_MS` | Latência simulada da chamada externa | `200` / `800` |
| `AUTOMATION_MAX_RETRIES` | Tentativas máximas antes de marcar `FALHA` | `3` |
| `AUTOMATION_BASE_DELAY_MS` | Delay base (ms) do exponential backoff | `1000` |

### `frontend/.env`

| Variável | Descrição | Default |
|---|---|---|
| `VITE_API_BASE_URL` | URL base da API do backend | `http://localhost:3333` |

## Scripts úteis

**Backend** (`backend/`): `npm run dev` · `npm run build` · `npm start` · `npm run prisma:migrate` · `npm run prisma:deploy`

**Frontend** (`frontend/`): `npm run dev` · `npm run build` · `npm run preview` · `npm run lint`
