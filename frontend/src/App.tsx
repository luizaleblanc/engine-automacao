import { CandidateForm } from "./features/candidates/CandidateForm";
import { CandidateDashboard } from "./features/candidates/CandidateDashboard";
import { useCandidates } from "./features/candidates/useCandidates";

function App() {
  const { candidates, loading, error, refresh, reprocess } = useCandidates();

  return (
    <main>
      <h1>Engine Resiliente de Automações</h1>
      <CandidateForm onCreated={() => void refresh()} />
      <CandidateDashboard
        candidates={candidates}
        loading={loading}
        error={error}
        onReprocess={reprocess}
      />
    </main>
  );
}

export default App;
