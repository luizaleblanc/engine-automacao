import type { Request, Response } from "express";
import { candidateService } from "./candidate.service";
import { createCandidateSchema } from "./candidate.schema";

export const candidateController = {
  async create(req: Request, res: Response): Promise<void> {
    const input = createCandidateSchema.parse(req.body);
    const candidate = await candidateService.register(input);
    res.status(201).json(candidate);
  },

  async list(_req: Request, res: Response): Promise<void> {
    const candidates = await candidateService.listAll();
    res.status(200).json(candidates);
  },
};
