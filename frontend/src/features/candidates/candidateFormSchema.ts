import { z } from "zod";

// Espelha backend/src/modules/candidates/candidate.schema.ts para dar feedback
// instantâneo no formulário, sem esperar o round-trip até a API.
export const candidateFormSchema = z.object({
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

export type CandidateFormValues = z.infer<typeof candidateFormSchema>;

export type CandidateFormErrors = Partial<Record<keyof CandidateFormValues, string>>;

export function validateCandidateForm(values: CandidateFormValues): CandidateFormErrors {
  const result = candidateFormSchema.safeParse(values);
  if (result.success) {
    return {};
  }

  const errors: CandidateFormErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in errors)) {
      errors[field as keyof CandidateFormValues] = issue.message;
    }
  }
  return errors;
}
