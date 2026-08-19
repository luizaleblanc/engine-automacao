import { useCallback, useEffect, useState } from "react";
import { candidatesApi } from "../../services/api/candidatesApi";
import { ApiError } from "../../services/api/ApiError";
import type { Candidate } from "../../types/candidate";

const POLL_INTERVAL_MS = 4000;

interface UseCandidatesResult {
  candidates: Candidate[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  reprocess: (id: string) => Promise<void>;
}

export function useCandidates(): UseCandidatesResult {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const data = await candidatesApi.list();
      setCandidates(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível carregar os candidatos.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const reprocess = useCallback(
    async (id: string): Promise<void> => {
      setCandidates((prev) =>
        prev.map((candidate) =>
          candidate.id === id ? { ...candidate, status: "PROCESSANDO" } : candidate,
        ),
      );
      try {
        const updated = await candidatesApi.reprocess(id);
        setCandidates((prev) => prev.map((c) => (c.id === id ? updated : c)));
      } catch (err) {
        await refresh();
        throw err;
      }
    },
    [refresh],
  );

  return { candidates, loading, error, refresh, reprocess };
}
