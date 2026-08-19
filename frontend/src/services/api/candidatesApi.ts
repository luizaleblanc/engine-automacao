import { httpClient } from "./httpClient";
import type { Candidate, CreateCandidateInput } from "../../types/candidate";

export const candidatesApi = {
  list: (): Promise<Candidate[]> => httpClient.get<Candidate[]>("/candidates"),
  create: (input: CreateCandidateInput): Promise<Candidate> =>
    httpClient.post<Candidate>("/candidates", input),
  reprocess: (id: string): Promise<Candidate> =>
    httpClient.post<Candidate>(`/candidates/${id}/reprocess`),
};
