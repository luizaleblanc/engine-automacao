import { automationQueue } from "../automation/automationService";
import { ConflictError, NotFoundError } from "../../shared/errors/AppError";
import type { CandidateDTO } from "./candidate.dto";
import { toCandidateDTO } from "./candidate.mapper";
import { candidateRepository } from "./candidate.repository";
import type { CreateCandidateInput } from "./candidate.schema";

export const candidateService = {
  async register(input: CreateCandidateInput): Promise<CandidateDTO> {
    const existing = await candidateRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError("Já existe um candidato cadastrado com este e-mail");
    }

    const candidate = await candidateRepository.create(input);

    // Disparo assíncrono e não bloqueante: a resposta HTTP não espera a automação.
    automationQueue.enqueue(candidate.id);

    return toCandidateDTO(candidate);
  },

  async listAll(): Promise<CandidateDTO[]> {
    const candidates = await candidateRepository.findAll();
    return candidates.map(toCandidateDTO);
  },

  async reprocess(id: string): Promise<CandidateDTO> {
    const candidate = await candidateRepository.findById(id);
    if (!candidate) {
      throw new NotFoundError("Candidato não encontrado");
    }

    if (candidate.status !== "FALHA") {
      throw new ConflictError(
        "Somente candidatos com automação em FALHA podem ser reprocessados",
      );
    }

    const updated = await candidateRepository.updateStatus(id, "PROCESSANDO");
    automationQueue.enqueue(id);

    return toCandidateDTO(updated);
  },
};
