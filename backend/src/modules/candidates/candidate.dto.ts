import type { AutomationStatus } from "../automation/AutomationStatus";

export interface CandidateDTO {
  id: string;
  name: string;
  email: string;
  role: string;
  linkedin: string;
  status: AutomationStatus;
  createdAt: string;
  updatedAt: string;
}
