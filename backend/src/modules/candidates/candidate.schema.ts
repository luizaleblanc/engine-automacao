import { z } from "zod";

export const createCandidateSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  role: z.string().trim().min(2, "Cargo deve ter ao menos 2 caracteres").max(120),
  linkedin: z
    .string()
    .trim()
    .url("LinkedIn deve ser uma URL válida")
    .refine((url) => url.includes("linkedin.com"), {
      message: "URL deve ser um perfil do LinkedIn",
    }),
});

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;

export const candidateIdParamSchema = z.object({
  id: z.string().uuid("Id de candidato inválido"),
});
