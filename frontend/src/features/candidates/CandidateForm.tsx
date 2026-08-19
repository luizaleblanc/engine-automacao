import { useState } from "react";
import type { FormEvent } from "react";
import { candidatesApi } from "../../services/api/candidatesApi";
import { ApiError } from "../../services/api/ApiError";
import type { Candidate } from "../../types/candidate";
import {
  candidateFormSchema,
  validateCandidateForm,
  type CandidateFormErrors,
  type CandidateFormValues,
} from "./candidateFormSchema";
import "./CandidateForm.css";

const EMPTY_FORM: CandidateFormValues = { name: "", email: "", role: "", linkedin: "" };

interface CandidateFormProps {
  onCreated?: (candidate: Candidate) => void;
}

export function CandidateForm({ onCreated }: CandidateFormProps) {
  const [values, setValues] = useState<CandidateFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<CandidateFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function handleChange(field: keyof CandidateFormValues, value: string): void {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    const parsed = candidateFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(validateCandidateForm(values));
      return;
    }

    setSubmitting(true);
    try {
      const candidate = await candidatesApi.create(parsed.data);
      setValues(EMPTY_FORM);
      setSuccessMessage(`Candidato "${candidate.name}" cadastrado com sucesso.`);
      onCreated?.(candidate);
    } catch (error) {
      if (error instanceof ApiError && error.code === "ConflictError") {
        setErrors((prev) => ({ ...prev, email: error.message }));
      } else if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else {
        setSubmitError("Não foi possível cadastrar o candidato. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="candidate-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
      <h2>Cadastrar candidato</h2>

      <label className="field">
        <span>Nome</span>
        <input
          type="text"
          value={values.name}
          onChange={(event) => handleChange("name", event.target.value)}
          aria-invalid={errors.name !== undefined}
          disabled={submitting}
        />
        {errors.name !== undefined ? <span className="field-error">{errors.name}</span> : null}
      </label>

      <label className="field">
        <span>E-mail</span>
        <input
          type="email"
          value={values.email}
          onChange={(event) => handleChange("email", event.target.value)}
          aria-invalid={errors.email !== undefined}
          disabled={submitting}
        />
        {errors.email !== undefined ? <span className="field-error">{errors.email}</span> : null}
      </label>

      <label className="field">
        <span>Cargo</span>
        <input
          type="text"
          value={values.role}
          onChange={(event) => handleChange("role", event.target.value)}
          aria-invalid={errors.role !== undefined}
          disabled={submitting}
        />
        {errors.role !== undefined ? <span className="field-error">{errors.role}</span> : null}
      </label>

      <label className="field">
        <span>LinkedIn</span>
        <input
          type="url"
          placeholder="https://www.linkedin.com/in/..."
          value={values.linkedin}
          onChange={(event) => handleChange("linkedin", event.target.value)}
          aria-invalid={errors.linkedin !== undefined}
          disabled={submitting}
        />
        {errors.linkedin !== undefined ? (
          <span className="field-error">{errors.linkedin}</span>
        ) : null}
      </label>

      {submitError !== null ? <p className="form-error">{submitError}</p> : null}
      {successMessage !== null ? <p className="form-success">{successMessage}</p> : null}

      <button type="submit" disabled={submitting}>
        {submitting ? "Cadastrando..." : "Cadastrar"}
      </button>
    </form>
  );
}
