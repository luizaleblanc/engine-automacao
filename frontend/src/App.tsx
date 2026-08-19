import { CandidateForm } from "./features/candidates/CandidateForm";
import { CandidateDashboard } from "./features/candidates/CandidateDashboard";
import { useCandidates } from "./features/candidates/useCandidates";
import "./App.css";

function App() {
  const { candidates, loading, error, refresh, reprocess } = useCandidates();

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <div>
            <div className="brand-name">Engine Resiliente de Automações</div>
            <div className="brand-sub">CANDIDATOS · PIPELINE DE NOTIFICAÇÃO</div>
          </div>
        </div>
        <div className="live-indicator">
          <span className="live-dot" />
          Atualizando a cada 4s
        </div>
      </header>

      <main className="grid">
        <CandidateForm onCreated={() => void refresh()} />
        <CandidateDashboard
          candidates={candidates}
          loading={loading}
          error={error}
          onReprocess={reprocess}
        />
      </main>

      <div className="footline">
        SQLite + Prisma · Disparo assíncrono não bloqueante · Histórico de tentativas por
        candidato
      </div>
    </div>
  );
}

export default App;
