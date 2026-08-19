import type { AutomationAttempt } from "@prisma/client";
import type { AutomationAttemptDTO } from "./automationAttempt.dto";

export function toAutomationAttemptDTO(attempt: AutomationAttempt): AutomationAttemptDTO {
  return {
    attemptNumber: attempt.attemptNumber,
    success: attempt.success,
    statusCode: attempt.statusCode,
    errorMessage: attempt.errorMessage,
    createdAt: attempt.createdAt.toISOString(),
  };
}
