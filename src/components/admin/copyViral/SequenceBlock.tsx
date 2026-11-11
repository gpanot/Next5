'use client';

import { useState, type ReactNode } from 'react';
import { copyViralMediaUrl, type CopyViralDirector, type CopyViralPreview, type CopyViralProject, type CopyViralShot } from '../../../types/admin/copyViral';
import { BackgroundSlot } from './BackgroundSlot';
import { DirectorCommand, DirectorPicker } from './DirectorPicker';
import { directorCommand, previewSequence, secondsLabel, timecode } from './useCopyViral';

type Props = {
  token: string;
  project: CopyViralProject;
  sequence: number;
  shots: CopyViralShot[];
  busy: boolean;
  onChange: () => void;
  /** Plays the whole sequence in the reference player (stops it when playing). */
  onPlay: () => void;
  playing: boolean;
  /** The shot cards of this sequence. */
  children: ReactNode;
};

/** A preview made from other takes than the ones now on the shots (a retake since): worth making again. */
const isStale = (preview: CopyViralPreview, shots: CopyViralShot[]) =>
  preview.takes.length !== shots.length || shots.some((s, i) => s.clip?.file !== preview.takes[i]);

function PreviewPanel({ token, project, sequence, shots, busy, onChange }: Omit<Props, 'children' | 'onPlay' | 'playing'>) {
  const [error, setError] = useState<string | null>(null);
  const preview = project.previews[String(sequence)];
  const [director, setDirector] = useState<CopyViralDirector>(preview?.director ?? 'claude');
  const missing = shots.filter((s) => !s.clip).length;
  const running = preview?.status === 'RUNNING';
  const stale = preview?.status === 'DONE' && isStale(preview, shots);

  const start = async () => {
    setError(null);
    try {
      await previewSequence(token, project.id, sequence, director);
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <div className="flex items-start gap-3">
      {preview?.status === 'DONE' && preview.video && (
        <video src={copyViralMediaUrl(token, project.id, preview.video, preview.finishedAt ?? undefined)} controls playsInline className="aspect-[9/16] w-28 shrink-0 rounded-lg bg-black" />
      )}
      <div className="max-w-xs space-y-1.5">
        <DirectorPicker value={director} onChange={setDirector} small />
        <button
          type="button"
          onClick={start}
          disabled={busy || running || missing > 0}
          className="min-h-9 rounded-lg bg-app-cta px-3 text-xs font-bold text-app-cta-ink shadow-sm transition hover:opacity-90 disabled:opacity-40"
          title="A quick 720 render of this sequence from my takes"
        >
          {running ? preview.step : preview ? 'Preview again (720)' : 'Preview this sequence (720)'}
        </button>
        <p className="text-[11px] text-app-muted">
          {missing ? `${missing} take${missing > 1 ? 's' : ''} to record first` : running ? (preview.director === 'claude' ? 'Claude Code: a few minutes' : 'About 30 s to 1 min') : stale ? 'Takes changed since: preview again' : preview?.status === 'DONE' ? 'Up to date' : 'Ready to preview'}
        </p>
        {(error || preview?.error) && <p className="max-w-xs text-[11px] break-words text-app-danger">{error ?? preview?.error}</p>}
        {preview?.director === 'claude' && (
          <a href={copyViralMediaUrl(token, project.id, `claude-short-seq-${sequence + 1}.log`, preview.finishedAt ?? project.updatedAt)} target="_blank" rel="noreferrer" className="block text-[11px] font-semibold text-app-muted underline">Claude Code log</a>
        )}
        {director === 'claude' && !missing && <DirectorCommand command={directorCommand(project.id, sequence, '720x1280')} />}
      </div>
    </div>
  );
}

/**
 * One picture scene of the original: its shots (one per 1-2 sentences), one background for all of them, and a quick
 * preview once every shot has a take.
 */
export function SequenceBlock({ token, project, sequence, shots, busy, onChange, onPlay, playing, children }: Props) {
  const first = shots[0];
  const last = shots[shots.length - 1];
  const takes = shots.filter((s) => s.clip).length;
  const hasEarlierPicture = project.shots.some((s) => s.sequence < sequence && s.background);
  const span = { startMs: first.startMs, endMs: last.endMs };

  return (
    <section className="space-y-3 rounded-2xl border border-app-line bg-app-sunken/50 p-3">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-extrabold text-app-ink">Sequence {sequence + 1}</h3>
            <button
              type="button"
              onClick={onPlay}
              className={`min-h-8 rounded-lg px-2 text-xs font-semibold transition ${playing ? 'bg-red-500 text-white hover:bg-red-400' : 'border border-app-line text-app-ink hover:bg-app-panel'}`}
            >
              {playing ? '■ Stop' : '▶ Play sequence'}
            </button>
          </div>
          <p className="text-xs text-app-muted">
            {timecode(span.startMs)} → {timecode(span.endMs)} · {secondsLabel(span.endMs - span.startMs)} · {shots.length} shot{shots.length > 1 ? 's' : ''} · {takes}/{shots.length} recorded
          </p>
          {first.reading && <BackgroundSlot token={token} projectId={project.id} shot={first} disabled={busy} onChange={onChange} previousHasPicture={hasEarlierPicture} />}
        </div>
        <PreviewPanel token={token} project={project} sequence={sequence} shots={shots} busy={busy} onChange={onChange} />
      </div>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}
