export interface AutomationAttemptDTO {
  attemptNumber: number;
  success: boolean;
  statusCode: number | null;
  errorMessage: string | null;
  createdAt: string;
}
