import { env } from "../../config/env";
import { WebhookError } from "./WebhookError";
import type { AutomationWebhookPayload, WebhookClient } from "./webhookClient";

function randomLatencyMs(): number {
  const { WEBHOOK_MIN_LATENCY_MS: min, WEBHOOK_MAX_LATENCY_MS: max } = env;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class WebhookSimulator implements WebhookClient {
  async notify(payload: AutomationWebhookPayload): Promise<void> {
    await wait(randomLatencyMs());

    if (Math.random() < env.WEBHOOK_SUCCESS_RATE) {
      return;
    }

    // Falha simulada: metade das falhas é 429 (rate limit), metade é 500 (erro do servidor).
    if (Math.random() < 0.5) {
      throw new WebhookError(
        `Limite de requisições excedido ao notificar candidato ${payload.candidateId}`,
        429,
      );
    }

    throw new WebhookError(
      `Falha no serviço externo ao notificar candidato ${payload.candidateId}`,
      500,
    );
  }
}

export const webhookSimulator = new WebhookSimulator();
