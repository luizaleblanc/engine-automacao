import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN é obrigatória"),
  WEBHOOK_SUCCESS_RATE: z.coerce.number().min(0).max(1).default(0.5),
  WEBHOOK_MIN_LATENCY_MS: z.coerce.number().int().nonnegative().default(200),
  WEBHOOK_MAX_LATENCY_MS: z.coerce.number().int().nonnegative().default(800),
  AUTOMATION_MAX_RETRIES: z.coerce.number().int().positive().default(3),
  AUTOMATION_BASE_DELAY_MS: z.coerce.number().int().positive().default(1000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
