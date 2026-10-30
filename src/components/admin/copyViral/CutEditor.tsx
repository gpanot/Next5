'use client';

import { useEffect, useRef, useState } from 'react';
import { copyViralMediaUrl, type CopyViralCutMode, type CopyViralProject, type CopyViralShotEdit } from '../../../types/admin/copyViral';
import { ShotCard } from './ShotCard';
import { ShotTimeline } from './ShotTimeline';
import { TranscriptButton } from './TranscriptButton';
import { mergeWithNext, moveCut, sameShots, setTarget, splitShot } from './shotEdits';
import { reanalyzeProject, saveShots, timecode } from './useCopyViral';
import { useRangePlayer } from './useRangePlayer';

const CUT_MODES: { id: CopyViralCutMode; label: string; hint: string }[] = [
  { id: 'sentences', label: 'Sentences', hint: 'Each picture cut moved to the nearest sentence end, long shots split into 1-2 sentences: every take is whole sentences.' },
  { id: 'pictures', label: 'Picture changes', hint: 'Exactly where the picture changes, even in the middle of a sentence.' },
];

/** Cut by sentences (easy to record) or by picture changes. Changing it finds the cuts again (resets edits). */
function CutModeSwitch({ token, project, onChanged }: { token: string; project: CopyViralProject; onChanged: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const pick = async (mode: CopyViralCutMode) => {
    if (mode === project.cutMode) return;
    if (project.shots.some((s) => s.reading || s.clip) && !confirm('Cut again? Lines and takes of every shot are cleared.')) return;
    setError(null);
    try {
      await reanalyzeProject(token, project.id, project.cutThreshold, mode);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-app-muted uppercase">Cut by</span>
        <div className="inline-flex rounded-xl bg-app-sunken p-1 text-xs font-bold">
          {CUT_MODES.map((m) => (
            <button key={m.id} type="button" onClick={() => pick(m.id)} className={`min-h-8 rounded-lg px-3 transition ${project.cutMode === m.id ? 'bg-app-panel text-app-ink shadow-sm' : 'text-app-muted hover:text-app-ink'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-app-muted">{CUT_MODES.find((m) => m.id === project.cutMode)?.hint}</p>
      {error && <p className="text-xs text-app-danger">{error}</p>}
    </div>
  );
}

const toEdits = (p: CopyViralProject): CopyViralShotEdit[] => p.shots.map(({ startMs, endMs, targetMs }) => ({ startMs, endMs, targetMs }));

/** Merge and split save at once; a moved cut or a new target waits this long for the next click. */
const SAVE_DELAY_MS = 800;

/**
 * Step 1, the cuts: reference player + editable shot list. Every edit saves by itself, so new stills show and a reload
 * keeps it. Remounted (key) on each saved version, so the draft starts from it.
 */
export function CutEditor({ token, project, onSaved }: { token: string; project: CopyViralProject; onSaved: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [shots, setShots] = useState(() => toEdits(project));
  const [selected, setSelected] = useState<number | null>(null);
  const [playheadMs, setPlayheadMs] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const delay = useRef(SAVE_DELAY_MS);
  const dirty = !sameShots(shots, toEdits(project));

  const player = useRangePlayer();

  useEffect(() => {
    // a failed save waits for the next edit instead of retrying in a loop
    if (!dirty || saving || error) return;
    const timer = setTimeout(async () => {
      setSaving(true);
      try {
        await saveShots(token, project.id, shots);
        onSaved();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed');
        setSaving(false);
      }
    }, delay.current);
    return () => clearTimeout(timer);
  }, [shots, dirty, saving, error, token, project.id, onSaved]);

  /** Selects the shot and plays it alone in the player (again from its start on each click). */
  const select = (i: number) => {
    setSelected(i);
    player.playRange(video.current, shots[i].startMs, shots[i].endMs);
  };

  const savedOf = (s: CopyViralShotEdit) => project.shots.find((p) => p.startMs === s.startMs && p.endMs === s.endMs);

  const frameOf = (s: CopyViralShotEdit) => {
    const frame = savedOf(s)?.frame;
    return frame ? copyViralMediaUrl(token, project.id, frame) : null;
  };

  /** Applies an edit; asks first when it clears lines or a take of the shots it touches. */
  const edit = (touched: number[], change: (cur: CopyViralShotEdit[]) => CopyViralShotEdit[], now = false) => {
    const lost = touched.filter((j) => shots[j] && (savedOf(shots[j])?.clip || savedOf(shots[j])?.myLine)).map((j) => j + 1);
    if (lost.length && !confirm(`This clears the lines and take of shot ${lost.join(' and ')}. Continue?`)) return;
    delay.current = now ? 0 : SAVE_DELAY_MS;
    setError(null);
    setShots(change);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        {project.reference && (
          <video
            ref={video}
            src={copyViralMediaUrl(token, project.id, project.reference)}
            controls
            playsInline
            onTimeUpdate={(e) => setPlayheadMs(e.currentTarget.currentTime * 1000)}
            className="aspect-[9/16] w-full rounded-xl bg-black shadow-sm"
          />
        )}
        <TranscriptButton shots={project.shots} />
        <p className="text-xs text-app-muted">
          {project.width}×{project.height} · {project.fps} fps · {timecode(project.durationMs)} · {shots.length} shots
        </p>
      </div>
      <div className="space-y-3">
        <CutModeSwitch token={token} project={project} onChanged={onSaved} />
        <ShotTimeline shots={shots} durationMs={project.durationMs} playheadMs={playheadMs} selected={selected} onSelect={select} />
        <div className="flex min-h-6 flex-wrap items-center gap-2 text-xs">
          {saving ? <span className="text-app-muted">Saving…</span> : dirty ? <span className="text-app-muted">Unsaved changes…</span> : <span className="text-app-muted">All changes saved</span>}
          {error && <span className="text-app-danger">{error}</span>}
        </div>
        <ul className="space-y-2">
          {shots.map((s, i) => (
            <ShotCard
              key={`${s.startMs}-${s.endMs}`}
              index={i}
              shot={s}
              frameUrl={frameOf(s)}
              said={savedOf(s)?.transcript ?? null}
              isLast={i === shots.length - 1}
              selected={selected === i}
              onSelect={() => select(i)}
              playing={player.playing === s.startMs}
              onStop={player.stop}
              busy={saving}
              onTarget={(ms) => edit([], (cur) => setTarget(cur, i, ms))}
              onMoveCut={(d) => edit([i, i + 1], (cur) => moveCut(cur, i, d))}
              onMerge={() => edit([i, i + 1], (cur) => mergeWithNext(cur, i), true)}
              onSplit={() => edit([i], (cur) => splitShot(cur, i, playheadMs), true)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
