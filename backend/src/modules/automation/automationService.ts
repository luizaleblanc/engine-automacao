import { env } from "../../config/env";
import { candidateRepository } from "../candidates/candidate.repository";
import { InMemoryAutomationQueue, type AutomationQueue } from "./automationQueue";
import { automationAttemptRepository } from "./automationAttempt.repository";
import { webhookSimulator } from "./webhookSimulator";
import { WebhookError } from "./WebhookError";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Exponential backoff com jitter: baseDelay * 2^(tentativa-1) + ruído aleatório. */
function backoffDelayMs(attempt: number): number {
  const exponential = env.AUTOMATION_BASE_DELAY_MS * 2 ** (attempt - 1);
  const jitter = Math.random() * env.AUTOMATION_BASE_DELAY_MS;
  return exponential + jitter;
}

async function runAttempts(candidateId: string, startingAttempt: number): Promise<void> {
  const candidate = await candidateRepository.findById(candidateId);
  if (!candidate) {
    console.error(`Candidato ${candidateId} não encontrado para processar automação`);
    return;
  }

  const maxAttempts = env.AUTOMATION_MAX_RETRIES;

  for (let attempt = startingAttempt; attempt <= maxAttempts; attempt += 1) {
    try {
      await webhookSimulator.notify({
        candidateId: candidate.id,
        name: candidate.name,
        email: candidate.email,
        role: candidate.role,
      });

      await automationAttemptRepository.record(candidateId, attempt, true);
      await candidateRepository.updateStatus(candidateId, "SUCESSO");
      return;
    } catch (err) {
      const statusCode = err instanceof WebhookError ? err.statusCode : undefined;
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      await automationAttemptRepository.record(candidateId, attempt, false, statusCode, message);

      if (attempt === maxAttempts) {
        await candidateRepository.updateStatus(candidateId, "FALHA");
        return;
      }

      await delay(backoffDelayMs(attempt));
    }
  }
}

export const automationService = {
  async process(candidateId: string): Promise<void> {
    await candidateRepository.updateStatus(candidateId, "PROCESSANDO");
    await runAttempts(candidateId, 1);
  },
};

export const automationQueue: AutomationQueue = new InMemoryAutomationQueue((candidateId) =>
  automationService.process(candidateId),
);
