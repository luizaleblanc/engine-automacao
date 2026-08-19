export interface AutomationQueue {
  enqueue(candidateId: string): void;
}

type JobHandler = (candidateId: string) => Promise<void>;

/**
 * Fila em memória: adequada ao escopo deste desafio (setup simples, sem
 * dependências externas). Em produção seria substituída por BullMQ/SQS
 * implementando a mesma interface AutomationQueue, sem tocar a lógica de negócio.
 */
export class InMemoryAutomationQueue implements AutomationQueue {
  constructor(private readonly handler: JobHandler) {}

  enqueue(candidateId: string): void {
    setImmediate(() => {
      this.handler(candidateId).catch((err: unknown) => {
        console.error(`Falha inesperada ao processar automação do candidato ${candidateId}:`, err);
      });
    });
  }
}
