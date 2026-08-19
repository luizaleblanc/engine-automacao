import type { Candidate } from "@prisma/client";
import { prisma } from "../../shared/database/prismaClient";
import type { CreateCandidateInput } from "./candidate.schema";

export const candidateRepository = {
  create(data: CreateCandidateInput): Promise<Candidate> {
    return prisma.candidate.create({ data });
  },

  findAll(): Promise<Candidate[]> {
    return prisma.candidate.findMany({ orderBy: { createdAt: "desc" } });
  },

  findById(id: string): Promise<Candidate | null> {
    return prisma.candidate.findUnique({ where: { id } });
  },

  findByEmail(email: string): Promise<Candidate | null> {
    return prisma.candidate.findUnique({ where: { email } });
  },
};
