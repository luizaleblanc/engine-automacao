import type { Candidate } from "@prisma/client";
import { AUTOMATION_STATUSES, type AutomationStatus } from "../automation/AutomationStatus";
import type { CandidateDTO } from "./candidate.dto";

function toAutomationStatus(value: string): AutomationStatus {
  return (AUTOMATION_STATUSES as readonly string[]).includes(value)
    ? (value as AutomationStatus)
    : "PENDENTE";
}

export function toCandidateDTO(candidate: Candidate): CandidateDTO {
  return {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    role: candidate.role,
    linkedin: candidate.linkedin,
    status: toAutomationStatus(candidate.status),
    createdAt: candidate.createdAt.toISOString(),
    updatedAt: candidate.updatedAt.toISOString(),
  };
}
