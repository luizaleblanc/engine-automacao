import { useState } from "react";
import { ApiError } from "../../services/api/ApiError";
import type { Candidate } from "../../types/candidate";
import "./CandidateDashboard.css";

const STATUS_LABEL: Record<Candidate["status"], string> = {
  PENDENTE: "Pendente",
  PROCESSANDO: "Processando",
  SUCESSO: "Sucesso",
  FALHA: "Falha",
};

interface RowError {
  id: string;
  message: string;
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

  return (
    <section className="candidate-dashboard">
      <h2>Candidatos</h2>

      {loading ? <p>Carregando...</p> : null}
      {error !== null ? <p className="dashboard-error">{error}</p> : null}
      {!loading && candidates.length === 0 ? <p>Nenhum candidato cadastrado ainda.</p> : null}

      {candidates.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Cargo</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => (
              <tr key={candidate.id}>
                <td>{candidate.name}</td>
                <td>{candidate.email}</td>
                <td>{candidate.role}</td>
                <td>
                  <span className={`status-badge status-${candidate.status.toLowerCase()}`}>
                    {STATUS_LABEL[candidate.status]}
                  </span>
                  {rowError !== null && rowError.id === candidate.id ? (
                    <p className="row-error">{rowError.message}</p>
                  ) : null}
                </td>
                <td>
                  <button
                    type="button"
                    disabled={candidate.status !== "FALHA" || reprocessingId === candidate.id}
                    onClick={() => void handleReprocess(candidate.id)}
                  >
                    {reprocessingId === candidate.id ? "Reprocessando..." : "Reprocessar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
