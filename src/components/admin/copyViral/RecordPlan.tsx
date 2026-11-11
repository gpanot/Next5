'use client';

import { useRef, useState } from 'react';
import { copyViralMediaUrl, type CopyViralProject, type CopyViralShot, type CopyViralStyle } from '../../../types/admin/copyViral';
import { EditableText } from './EditableText';
import { RecordShotCard } from './RecordShotCard';
import { SequenceBlock } from './SequenceBlock';
import { ShotTimeline } from './ShotTimeline';
import { StealPanel } from './StealPanel';
import { TranscriptButton } from './TranscriptButton';
import { RecorderModal } from './recorder/RecorderModal';
import { changeShot, readProjectShots, rewriteLines, saveCaption, timecode } from './useCopyViral';
import { useRangePlayer } from './useRangePlayer';

const STYLE_ROWS: [keyof CopyViralStyle, string][] = [
  ['hook', 'Hook'], ['cta', 'Ending'], ['captionFont', 'Caption font'], ['captionCase', 'Caption case'], ['captionPosition', 'Caption place'],
  ['captionHighlight', 'Said word'], ['colors', 'Colors'], ['grade', 'Grade'], ['transitions', 'Transitions'], ['music', 'Music'],
  ['soundEffects', 'Sound effects'], ['notes', 'Notes'],
];

function StyleSummary({ style }: { style: CopyViralStyle }) {
  return (
    <details className="group rounded-xl border border-app-line bg-app-panel p-4 shadow-sm">
      <summary className="cursor-pointer list-none text-sm font-bold text-app-ink select-none">
        <span className="mr-1 inline-block transition group-open:rotate-90">›</span> The reel&apos;s look
      </summary>
      <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-sm md:grid-cols-[140px_1fr]">
        {STYLE_ROWS.filter(([k]) => style[k]).map(([k, label]) => (
          <div key={k} className="contents">
            <dt className="text-app-muted">{label}</dt>
            <dd className="text-app-ink">{String(style[k])}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

/** Shots grouped by the picture scene they come from, in order. */
const groupBySequence = (shots: CopyViralShot[]) =>
  shots.reduce<{ sequence: number; shots: CopyViralShot[] }[]>((groups, s) => {
    const last = groups[groups.length - 1];
    if (last && last.sequence === s.sequence) last.shots.push(s);
    else groups.push({ sequence: s.sequence, shots: [s] });
    return groups;
  }, []);

/**
 * Step 2, recording, laid out like the cut editor: the reference player on the left, the timeline and one card per shot
 * (grouped by sequence) with the original, Guillaume's line, the merge/split tools and his take.
 */
export function RecordPlan({ token, project, onChange }: { token: string; project: CopyViralProject; onChange: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [recordAt, setRecordAt] = useState<number | null>(null);
  const [changing, setChanging] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [playheadMs, setPlayheadMs] = useState(0);
  const player = useRangePlayer();
  const reading = project.status === 'READING';
  const read = project.shots.some((s) => s.reading);
  const takes = project.shots.filter((s) => s.clip).length;
  const sequences = groupBySequence(project.shots);

  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  /** Selects the shot and plays it alone in the player (again from its start on each click). */
  const select = (i: number) => {
    setSelected(i);
    player.playRange(video.current, project.shots[i].startMs, project.shots[i].endMs);
  };

  /** Merge with the next shot or split in two; asks first when it deletes takes. */
  const change = async (shot: CopyViralShot, action: 'merge' | 'split') => {
    const touched = action === 'merge' ? [shot, project.shots[shot.index + 1]] : [shot];
    const lost = touched.filter((s) => s?.clip).map((s) => s.index + 1);
    if (lost.length && !confirm(`This deletes the take${lost.length > 1 ? 's' : ''} of shot ${lost.join(' and ')}. Continue?`)) return;
    setChanging(true);
    await act(() => changeShot(token, project.id, shot.index, shot.startMs, action));
    setChanging(false);
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
          {timecode(project.durationMs)} · {project.shots.length} shots · {takes}/{project.shots.length} takes
        </p>
      </div>
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={reading}
            onClick={() => act(() => (read ? rewriteLines(token, project.id) : readProjectShots(token, project.id)))}
            className="min-h-10 rounded-xl bg-app-cta px-4 text-sm font-bold text-app-cta-ink shadow-sm transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
          >
            {reading ? 'Reading the shots and writing my lines…' : read ? 'Rewrite my lines' : 'Read the shots + write my lines'}
          </button>
          {read && !reading && (
            <button type="button" onClick={() => act(() => readProjectShots(token, project.id))} className="min-h-10 rounded-xl border border-app-line px-3 text-sm font-semibold text-app-ink transition hover:bg-app-sunken">
              Read the shots again
            </button>
          )}
          {read && !reading && (
            <button
              type="button"
              onClick={() => setRecordAt(Math.max(0, project.shots.findIndex((s) => !s.clip)))}
              className="flex min-h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-red-400"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-white" /> {takes ? 'Record the missing shots' : 'Record my shots'}
            </button>
          )}
        </div>
        {!read && !reading && <p className="text-xs text-app-muted">Whisper transcript (about $0.006/min) + Gemini 3.6 Flash reading of 3 stills per shot + the Blueprint script model for your lines.</p>}
        {(error || project.error) && <p className="rounded-xl bg-app-accent-soft p-3 text-sm text-app-danger">{error ?? project.error}</p>}
        <ShotTimeline shots={project.shots} durationMs={project.durationMs} playheadMs={playheadMs} selected={selected} onSelect={select} done={project.shots.map((s) => !!s.clip)} />
        {project.reference && <StealPanel token={token} project={project} busy={reading} onChange={onChange} />}
        {project.style && <StyleSummary style={project.style} />}
        {read && (
          <div className="space-y-1 rounded-xl border border-app-line bg-app-panel p-3 shadow-sm">
            <p className="text-[11px] font-bold tracking-wide text-app-muted uppercase">My post caption</p>
            <EditableText value={project.myCaption} rows={3} onSave={(text) => saveCaption(token, project.id, text).then(onChange)} />
          </div>
        )}
        <div className="space-y-3">
          {sequences.map(({ sequence, shots }) => {
            const from = shots[0].startMs, to = shots[shots.length - 1].endMs;
            const seqPlaying = player.playing === from && selected === null;
            return (
              <SequenceBlock
                key={sequence}
                token={token}
                project={project}
                sequence={sequence}
                shots={shots}
                busy={reading}
                onChange={onChange}
                playing={seqPlaying}
                onPlay={() => {
                  if (seqPlaying) return player.stop();
                  setSelected(null);
                  player.playRange(video.current, from, to);
                }}
              >
                {shots.map((s) => (
                  <RecordShotCard
                    key={`${s.startMs}-${s.endMs}`}
                    token={token}
                    projectId={project.id}
                    shot={s}
                    frameUrl={s.frame ? copyViralMediaUrl(token, project.id, s.frame) : null}
                    busy={reading || changing}
                    selected={selected === s.index}
                    onSelect={() => select(s.index)}
                    playing={player.playing === s.startMs && selected === s.index}
                    onStop={player.stop}
                    onChange={onChange}
                    onRecord={() => setRecordAt(s.index)}
                    onMerge={s.index < project.shots.length - 1 ? () => change(s, 'merge') : undefined}
                    onSplit={() => change(s, 'split')}
                  />
                ))}
              </SequenceBlock>
            );
          })}
        </div>
      </div>
      {recordAt !== null && (
        <RecorderModal token={token} projectId={project.id} shots={project.shots} startIndex={recordAt} onClose={() => setRecordAt(null)} onSaved={onChange} />
      )}
    </div>
  );
}
