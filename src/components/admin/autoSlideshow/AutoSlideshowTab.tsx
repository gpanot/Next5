'use client';

/** Auto Slideshow: a website URL in, 1-20 TikTok photo slideshows out, each on a proven Slideshow Knowledge model. */
import { useState } from 'react';
import { RunView } from './RunView';
import { StartScreen } from './StartScreen';

/** `stickyTop` offsets the run's pinned step bar when the page has its own sticky top bar. */
/** `noBack`: a user's workspace shows its run without the "New run" link. */
type Props = { token: string; stickyTop?: string; initialRunId?: string | null; noBack?: boolean };

export function AutoSlideshowTab({ token, stickyTop, initialRunId = null, noBack = false }: Props) {
  const [runId, setRunId] = useState<string | null>(initialRunId);
  if (runId) return <RunView key={runId} token={token} runId={runId} onBack={noBack ? undefined : () => setRunId(null)} stickyTop={stickyTop} />;
  return <StartScreen token={token} onRun={setRunId} />;
}
