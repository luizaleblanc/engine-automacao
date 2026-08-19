import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import { env } from "./config/env";
import { candidateRoutes } from "./modules/candidates/candidate.routes";
import { errorHandler } from "./shared/errors/errorHandler";

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/candidates", candidateRoutes);

  app.use(errorHandler);

  return app;
}
