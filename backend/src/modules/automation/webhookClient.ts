export interface AutomationWebhookPayload {
  candidateId: string;
  name: string;
  email: string;
  role: string;
}

export interface WebhookClient {
  notify(payload: AutomationWebhookPayload): Promise<void>;
}
