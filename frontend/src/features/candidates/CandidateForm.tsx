import { useState } from "react";
import type { FormEvent } from "react";
import { candidatesApi } from "../../services/api/candidatesApi";
import { ApiError } from "../../services/api/ApiError";
import type { Candidate } from "../../types/candidate";
import { Toast } from "../../components/Toast";
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function handleChange(field: keyof CandidateFormValues, value: string): void {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitError(null);

    const parsed = candidateFormSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(validateCandidateForm(values));
      return;
    }

    setSubmitting(true);
    try {
      const candidate = await candidatesApi.create(parsed.data);
      setValues(EMPTY_FORM);
      setToastMessage(`Candidato "${candidate.name}" cadastrado com sucesso.`);
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
      <div className="panel-head">
        <div className="panel-title">Cadastrar candidato</div>
        <div className="panel-hint">Dispara a automação de notificação ao salvar.</div>
      </div>

      <div className="panel-body">
        <div className="field">
          <label className="field-label" htmlFor="candidate-name">
            Nome
          </label>
          <input
            id="candidate-name"
            type="text"
            placeholder="Marina Costa"
            value={values.name}
            onChange={(event) => handleChange("name", event.target.value)}
            aria-invalid={errors.name !== undefined}
            disabled={submitting}
          />
          {errors.name !== undefined ? <span className="field-error">{errors.name}</span> : null}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="candidate-email">
            E-mail
          </label>
          <input
            id="candidate-email"
            type="email"
            placeholder="marina.costa@email.com"
            value={values.email}
            onChange={(event) => handleChange("email", event.target.value)}
            aria-invalid={errors.email !== undefined}
            disabled={submitting}
          />
          {errors.email !== undefined ? (
            <span className="field-error">{errors.email}</span>
          ) : null}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="candidate-role">
            Cargo
          </label>
          <input
            id="candidate-role"
            type="text"
            placeholder="Engenheira de Software Sênior"
            value={values.role}
            onChange={(event) => handleChange("role", event.target.value)}
            aria-invalid={errors.role !== undefined}
            disabled={submitting}
          />
          {errors.role !== undefined ? <span className="field-error">{errors.role}</span> : null}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="candidate-linkedin">
            LinkedIn
          </label>
          <input
            id="candidate-linkedin"
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
        </div>

        {submitError !== null ? <p className="form-error">{submitError}</p> : null}

        <button type="submit" disabled={submitting}>
          {submitting ? "Cadastrando..." : "Cadastrar candidato"}
        </button>
      </div>

      <div className="panel-footnote">
        Retry · backoff exponencial · até 3 tentativas
        <br />
        Rate limit · 10 req/min em rotas de escrita
      </div>

      {toastMessage !== null ? (
        <Toast message={toastMessage} variant="success" onDismiss={() => setToastMessage(null)} />
      ) : null}
    </form>
  );
}
