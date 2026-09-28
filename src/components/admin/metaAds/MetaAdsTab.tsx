'use client';

/** "Perfect Ads" lab: a website URL in, up to 15 ready-to-run 4:5 Meta ads out. */
import { useState } from 'react';
import { RunDashboard } from './RunDashboard';
import { StartScreen } from './StartScreen';

export function MetaAdsTab({ token }: { token: string }) {
  const [runId, setRunId] = useState<string | null>(null);

  if (runId) return <RunDashboard key={runId} token={token} runId={runId} onBack={() => setRunId(null)} onRun={setRunId} />;
  return <StartScreen token={token} onRun={setRunId} />;
}
