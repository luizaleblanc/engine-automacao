import { Router } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { readRateLimiter, writeRateLimiter } from "../../shared/http/rateLimiters";
import { candidateController } from "./candidate.controller";

export const candidateRoutes = Router();

candidateRoutes.post("/", writeRateLimiter, asyncHandler(candidateController.create));
candidateRoutes.get("/", readRateLimiter, asyncHandler(candidateController.list));
candidateRoutes.post(
  "/:id/reprocess",
  writeRateLimiter,
  asyncHandler(candidateController.reprocess),
);
