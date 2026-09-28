'use client';

/** "Perfect Ads" lab: a website URL in, up to 15 ready-to-run 4:5 Meta ads out. */
import { useState, type ReactNode } from 'react';
import { RunDashboard } from './RunDashboard';
import { StartScreen } from './StartScreen';

/** `header` shows on the start screen only; a run takes the full page. */
export function MetaAdsTab({ token, header }: { token: string; header?: ReactNode }) {
  const [runId, setRunId] = useState<string | null>(null);

  if (runId) return <RunDashboard key={runId} token={token} runId={runId} onBack={() => setRunId(null)} onRun={setRunId} />;
  return (
    <>
      {header}
      <StartScreen token={token} onRun={setRunId} />
    </>
  );
}
