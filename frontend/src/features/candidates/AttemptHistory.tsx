import { useEffect, useState } from "react";
import { candidatesApi } from "../../services/api/candidatesApi";
import { ApiError } from "../../services/api/ApiError";
import type { AutomationAttempt } from "../../types/candidate";
import { Skeleton } from "../../components/Skeleton";
import "./AttemptHistory.css";

interface AttemptHistoryProps {
  candidateId: string;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function AttemptHistory({ candidateId }: AttemptHistoryProps) {
  const [attempts, setAttempts] = useState<AutomationAttempt[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAttempts(null);
    setError(null);

    candidatesApi
      .listAttempts(candidateId)
      .then((data) => {
        if (!cancelled) setAttempts(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Não foi possível carregar o histórico.");
      });

    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  if (error !== null) {
    return <p className="attempt-history-error">{error}</p>;
  }

  if (attempts === null) {
    return (
      <div className="attempt-history-loading">
        <Skeleton width="220px" />
        <Skeleton width="180px" />
      </div>
    );
  }

  if (attempts.length === 0) {
    return <p className="attempt-history-empty">Nenhuma tentativa registrada ainda.</p>;
  }

  return (
    <ol className="attempt-history">
      {attempts.map((attempt) => (
        <li key={attempt.attemptNumber} className={attempt.success ? "attempt-ok" : "attempt-fail"}>
          <span className="attempt-dot" aria-hidden="true" />
          <span className="attempt-index">#{attempt.attemptNumber}</span>
          <span className="attempt-outcome">{attempt.success ? "sucesso" : "falha"}</span>
          {attempt.statusCode !== null ? (
            <span className="attempt-code">HTTP {attempt.statusCode}</span>
          ) : null}
          {attempt.errorMessage !== null ? (
            <span className="attempt-message">{attempt.errorMessage}</span>
          ) : null}
          <span className="attempt-time">{formatTime(attempt.createdAt)}</span>
        </li>
      ))}
    </ol>
  );
}
