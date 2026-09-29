'use client';

/** Auto Slideshow: a website URL in, 1-20 TikTok photo slideshows out, each on a proven Slideshow Knowledge model. */
import { useState } from 'react';
import { RunView } from './RunView';
import { StartScreen } from './StartScreen';

export function AutoSlideshowTab({ token }: { token: string }) {
  const [runId, setRunId] = useState<string | null>(null);
  if (runId) return <RunView key={runId} token={token} runId={runId} onBack={() => setRunId(null)} />;
  return <StartScreen token={token} onRun={setRunId} />;
}
