import { Fragment, useState } from "react";
import type { CSSProperties } from "react";
import { ApiError } from "../../services/api/ApiError";
import type { AutomationStatus, Candidate } from "../../types/candidate";
import { Skeleton } from "../../components/Skeleton";
import { AttemptHistory } from "./AttemptHistory";
import "./CandidateDashboard.css";

const STATUS_ORDER: AutomationStatus[] = ["PENDENTE", "PROCESSANDO", "SUCESSO", "FALHA"];
const SKELETON_ROWS = 4;

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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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

  function toggleExpanded(id: string): void {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const counts = STATUS_ORDER.map((status) => ({
    status,
    count: candidates.filter((c) => c.status === status).length,
  }));

  const showSkeleton = loading && candidates.length === 0;
  const showEmptyState = !loading && candidates.length === 0;

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

      {error !== null ? <p className="dashboard-message dashboard-error">{error}</p> : null}

      {showEmptyState ? (
        <div className="empty-state">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M3 9h18" />
            <path d="M8 4v3" />
            <path d="M16 4v3" />
          </svg>
          <p>Nenhum candidato cadastrado ainda.</p>
        </div>
      ) : null}

      {showSkeleton || candidates.length > 0 ? (
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
            {showSkeleton
              ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
                  <tr key={index}>
                    <td>
                      <Skeleton width="120px" />
                    </td>
                    <td>
                      <Skeleton width="160px" />
                    </td>
                    <td>
                      <Skeleton width="140px" />
                    </td>
                    <td>
                      <Skeleton width="80px" />
                    </td>
                    <td className="col-actions">
                      <Skeleton width="90px" />
                    </td>
                  </tr>
                ))
              : candidates.map((candidate) => {
                  const meta = STATUS_META[candidate.status];
                  const expanded = expandedIds.has(candidate.id);
                  return (
                    <Fragment key={candidate.id}>
                      <tr style={{ "--stripe-color": meta.fg } as RowStyle}>
                        <td className="cand-name">
                          <button
                            type="button"
                            className="expand-toggle"
                            aria-expanded={expanded}
                            onClick={() => toggleExpanded(candidate.id)}
                          >
                            <svg
                              className={`expand-chevron${expanded ? " open" : ""}`}
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="m9 6 6 6-6 6" />
                            </svg>
                            {candidate.name}
                          </button>
                        </td>
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
                      {expanded ? (
                        <tr className="attempt-row">
                          <td colSpan={5}>
                            <AttemptHistory candidateId={candidate.id} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
