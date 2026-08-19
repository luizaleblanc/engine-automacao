import type { Request, Response } from "express";
import { candidateService } from "./candidate.service";
import { candidateIdParamSchema, createCandidateSchema } from "./candidate.schema";

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

  async reprocess(req: Request, res: Response): Promise<void> {
    const { id } = candidateIdParamSchema.parse(req.params);
    const candidate = await candidateService.reprocess(id);
    res.status(200).json(candidate);
  },
};
