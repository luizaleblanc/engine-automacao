import { Router } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { candidateController } from "./candidate.controller";

export const candidateRoutes = Router();

candidateRoutes.post("/", asyncHandler(candidateController.create));
candidateRoutes.get("/", asyncHandler(candidateController.list));
