export class WebhookError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "WebhookError";
    this.statusCode = statusCode;
  }
}
