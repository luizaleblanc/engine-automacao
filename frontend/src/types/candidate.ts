export const AUTOMATION_STATUSES = ["PENDENTE", "PROCESSANDO", "SUCESSO", "FALHA"] as const;

export type AutomationStatus = (typeof AUTOMATION_STATUSES)[number];

export interface Candidate {
  id: string;
  name: string;
  email: string;
  role: string;
  linkedin: string;
  status: AutomationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCandidateInput {
  name: string;
  email: string;
  role: string;
  linkedin: string;
}
