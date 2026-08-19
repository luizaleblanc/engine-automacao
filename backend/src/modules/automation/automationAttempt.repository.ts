import type { AutomationAttempt } from "@prisma/client";
import { prisma } from "../../shared/database/prismaClient";

export const automationAttemptRepository = {
  findByCandidateId(candidateId: string): Promise<AutomationAttempt[]> {
    return prisma.automationAttempt.findMany({
      where: { candidateId },
      orderBy: { attemptNumber: "asc" },
    });
  },

  record(
    candidateId: string,
    attemptNumber: number,
    success: boolean,
    statusCode?: number,
    errorMessage?: string,
  ): Promise<AutomationAttempt> {
    return prisma.automationAttempt.create({
      data: {
        candidateId,
        attemptNumber,
        success,
        statusCode: statusCode ?? null,
        errorMessage: errorMessage ?? null,
      },
    });
  },
};
