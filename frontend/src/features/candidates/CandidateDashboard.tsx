import { useState } from "react";
import type { CSSProperties } from "react";
import { ApiError } from "../../services/api/ApiError";
import type { AutomationStatus, Candidate } from "../../types/candidate";
import "./CandidateDashboard.css";

const STATUS_ORDER: AutomationStatus[] = ["PENDENTE", "PROCESSANDO", "SUCESSO", "FALHA"];

const STATUS_META: Record<
  AutomationStatus,
  { label: string; fg: string; wash: string; pulse: boolean }
> = {
  PENDENTE: { label: "Pendente", fg: "var(--st-pendente)", wash: "var(--st-pendente-wash)", pulse: false },
  PROCESSANDO: {
    label: "Processando",
    fg: "var(--st-processando)",
    wash: "var(--st-processando-wash)",
    pulse: true,
  },
  SUCESSO: { label: "Sucesso", fg: "var(--st-sucesso)", wash: "var(--st-sucesso-wash)", pulse: false },
  FALHA: { label: "Falha", fg: "var(--st-falha)", wash: "var(--st-falha-wash)", pulse: false },
};

interface RowError {
  id: string;
  message: string;
}

interface RowStyle extends CSSProperties {
  "--stripe-color": string;
}

interface CandidateDashboardProps {
  candidates: Candidate[];
  loading: boolean;
  error: string | null;
  onReprocess: (id: string) => Promise<void>;
}

export function CandidateDashboard({
  candidates,
  loading,
  error,
  onReprocess,
}: CandidateDashboardProps) {
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<RowError | null>(null);

  async function handleReprocess(id: string): Promise<void> {
    setReprocessingId(id);
    setRowError(null);
    try {
      await onReprocess(id);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Falha ao reprocessar.";
      setRowError({ id, message });
    } finally {
      setReprocessingId(null);
    }
  }

  const counts = STATUS_ORDER.map((status) => ({
    status,
    count: candidates.filter((c) => c.status === status).length,
  }));

  return (
    <section className="candidate-dashboard">
      <div className="panel-head">
        <div className="panel-title">Candidatos</div>
      </div>

      <div className="stat-strip">
        {counts.map(({ status, count }) => (
          <div className="stat" key={status}>
            <div className="stat-label">
              <span className="stat-swatch" style={{ background: STATUS_META[status].fg }} />
              {STATUS_META[status].label}
            </div>
            <div className="stat-value tabular">{count}</div>
          </div>
        ))}
      </div>

      {loading ? <p className="dashboard-message">Carregando...</p> : null}
      {error !== null ? <p className="dashboard-message dashboard-error">{error}</p> : null}
      {!loading && candidates.length === 0 ? (
        <p className="dashboard-message">Nenhum candidato cadastrado ainda.</p>
      ) : null}

      {candidates.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Cargo</th>
              <th>Status</th>
              <th className="col-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => {
              const meta = STATUS_META[candidate.status];
              return (
                <tr key={candidate.id} style={{ "--stripe-color": meta.fg } as RowStyle}>
                  <td className="cand-name">{candidate.name}</td>
                  <td className="cand-email">{candidate.email}</td>
                  <td className="cand-role">{candidate.role}</td>
                  <td>
                    <span
                      className={`status-chip${meta.pulse ? " pulse" : ""}`}
                      style={{ background: meta.wash, color: meta.fg }}
                    >
                      <span className="dot" style={{ background: meta.fg }} />
                      {meta.label}
                    </span>
                    {rowError !== null && rowError.id === candidate.id ? (
                      <p className="row-error">{rowError.message}</p>
                    ) : null}
                  </td>
                  <td className="col-actions">
                    <button
                      type="button"
                      disabled={candidate.status !== "FALHA" || reprocessingId === candidate.id}
                      onClick={() => void handleReprocess(candidate.id)}
                    >
                      {reprocessingId === candidate.id ? "Reprocessando..." : "Reprocessar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
