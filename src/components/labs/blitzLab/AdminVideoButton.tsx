'use client';

import { useEffect, useRef, useState } from 'react';
import { isImpersonating } from '../../../lib/impersonation';
import type { LabClient } from '../labClient';
import type { BlitzProjectDto } from './api';
import { saveVideo } from './KeptList';

/** True for the admin: the admin lab client, or an "Open as user" tab. Admin-only tools show then. */
export const isAdminLab = (client: LabClient): boolean => client.id.startsWith('admin:') || isImpersonating();

type Props = {
  /** The render this button started for the open card; null before the first tap. */
  project: BlitzProjectDto | null;
  projectId: string | null;
  /** True while the render request is sent. */
  submitting: boolean;
  /** Queue place (1 = next) while the job waits. */
  queuePosition?: number;
  /** The poller gave up on this render. */
  stalled: boolean;
  /** Why it cannot render yet (shown as the label). */
  blockedReason: string | null;
  error: string | null;
  onGenerate: () => void;
};

type Phase = 'idle' | 'working' | 'ready' | 'failed';

const phaseOf = ({ project, projectId, submitting, stalled }: Props): Phase => {
  if (submitting) return 'working';
  if (!projectId) return 'idle';
  if (project?.renderStatus === 'COMPLETED' && project.renderedVideoUrl) return 'ready';
  if (stalled || project?.renderStatus === 'FAILED') return 'failed';
  return 'working';
};

function FilmIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </svg>
  );
}

const workingLabel = (p: Props) =>
  p.submitting ? 'Starting…' : p.project?.renderStatus === 'PROCESSING' ? 'Rendering video…' : p.queuePosition ? `In queue · #${p.queuePosition}` : 'Queued…';

/**
 * Admin-only "Generate Video" under the card: renders the open deck video with its voiceover (no music), then
 * downloads the MP4 once it is ready. "Download again" keeps the file one tap away.
 */
export function AdminVideoButton(props: Props) {
  const { project, projectId, blockedReason, error, onGenerate } = props;
  const phase = phaseOf(props);
  const [saving, setSaving] = useState(false);
  const saved = useRef<string | null>(null);

  const download = async () => {
    if (!project?.renderedVideoUrl) return;
    setSaving(true);
    await saveVideo(project.renderedVideoUrl, `blitz-${project.id}.mp4`);
    setSaving(false);
  };

  // Downloads once when the render lands, as the slideshow editor does.
  useEffect(() => {
    if (phase !== 'ready' || !projectId || saved.current === projectId) return;
    saved.current = projectId;
    void download();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one download per finished render
  }, [phase, projectId]);

  const base = 'flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold shadow-sm transition active:scale-95 disabled:active:scale-100';
  return (
    <div className="flex w-full max-w-[400px] flex-col items-center gap-2">
      {phase === 'ready' ? (
        <div className="flex w-full gap-2">
          <button type="button" onClick={() => void download()} disabled={saving} className={`${base} bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60`}>
            {saving ? 'Saving…' : 'Download video'}
          </button>
          <button type="button" onClick={onGenerate} disabled={blockedReason !== null} className={`${base} border border-app-line bg-app-panel text-app-ink hover:bg-app-sunken disabled:opacity-40`}>
            Render again
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onGenerate}
          disabled={phase === 'working' || blockedReason !== null}
          title="Admin only: render this video with its voiceover and download the MP4"
          className={`${base} bg-app-cta text-app-cta-ink hover:opacity-90 ${phase === 'working' ? '' : 'disabled:opacity-40'}`}
        >
          {phase === 'working' ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
              <span aria-live="polite">{workingLabel(props)}</span>
            </>
          ) : (
            <>
              <FilmIcon />
              {blockedReason ?? (phase === 'failed' ? 'Generate Video · try again' : 'Generate Video')}
            </>
          )}
        </button>
      )}
      {(error || phase === 'failed') && (
        <p role="alert" className="text-center text-xs text-red-700 dark:text-red-300">{error ?? 'Render failed. Try again.'}</p>
      )}
    </div>
  );
}

type CtaProps = {
  /** Queues the render of the open card; resolves to its project id, or null when it did not start. */
  generate: () => Promise<string | null>;
  library: BlitzProjectDto[];
  queue: Record<string, number>;
  stalled: Record<string, true>;
  blockedReason: string | null;
  error: string | null;
};

/** The admin CTA with its own render: mount it keyed by the open card, so another card starts fresh. */
export function AdminVideoCta({ generate, library, queue, stalled, blockedReason, error }: CtaProps) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const start = async () => {
    setSubmitting(true);
    const id = await generate().catch(() => null);
    if (id) setProjectId(id);
    setSubmitting(false);
  };
  return (
    <AdminVideoButton
      project={library.find((p) => p.id === projectId) ?? null}
      projectId={projectId}
      submitting={submitting}
      queuePosition={projectId ? queue[projectId] : undefined}
      stalled={projectId !== null && stalled[projectId] === true}
      blockedReason={blockedReason}
      error={error}
      onGenerate={() => void start()}
    />
  );
}
