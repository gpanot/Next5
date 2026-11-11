'use client';

import type { CopyViralShotEdit } from '../../../types/admin/copyViral';
import { secondsLabel, timecode } from './useCopyViral';

type Props = {
  index: number;
  shot: CopyViralShotEdit;
  frameUrl: string | null;
  /** What the reference says in this shot (saved shots only). */
  said: string | null;
  isLast: boolean;
  selected: boolean;
  /** Selects the shot and plays it alone (again on each click). */
  onSelect: () => void;
  playing: boolean;
  onStop: () => void;
  /** A save is running: boundary tools wait for it. */
  busy: boolean;
  onTarget: (ms: number) => void;
  onMoveCut: (deltaMs: number) => void;
  onMerge: () => void;
  onSplit: () => void;
};

/** Round play / playing mark over a shot's still. */
export function PlayBadge({ playing }: { playing: boolean }) {
  return (
    <span className="absolute inset-0 flex items-center justify-center">
      <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm text-white shadow-md transition ${playing ? 'bg-red-500' : 'bg-black/55'}`}>
        {playing ? '■' : '▶'}
      </span>
    </span>
  );
}

const smallBtn = 'min-h-8 rounded-lg border border-app-line px-2 text-xs font-semibold text-app-ink transition hover:bg-app-sunken disabled:opacity-30';

/** One shot of the reference: its still, times, target length and the boundary tools. */
export function ShotCard({ index, shot, frameUrl, said, isLast, selected, onSelect, playing, onStop, busy, onTarget, onMoveCut, onMerge, onSplit }: Props) {
  const length = shot.endMs - shot.startMs;
  return (
    <li className={`flex gap-3 rounded-xl border bg-app-panel p-3 shadow-sm transition ${selected ? 'border-app-ink' : 'border-app-line'}`}>
      <button type="button" onClick={onSelect} className="relative aspect-[9/16] w-24 shrink-0 overflow-hidden rounded-lg bg-app-sunken">
        {frameUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={frameUrl} alt={`Shot ${index + 1}`} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-[11px] text-app-muted">Saving…</span>
        )}
        <span className="absolute top-1 left-1 rounded-md bg-app-ink px-1.5 text-[11px] font-bold text-app-panel">{index + 1}</span>
        <PlayBadge playing={playing} />
      </button>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-bold text-app-ink">
          {timecode(shot.startMs)} → {timecode(shot.endMs)} <span className="font-normal text-app-muted">· {secondsLabel(length)}</span>
        </p>
        <p className="line-clamp-3 text-sm text-app-muted italic">
          {said === null ? '…' : said ? `“${said}”` : '(no speech)'}
        </p>
        <label className="flex items-center gap-2 text-xs text-app-muted">
          Target
          <input
            type="number"
            step={0.1}
            min={0.1}
            value={(shot.targetMs / 1000).toFixed(1)}
            onChange={(e) => onTarget(Number(e.target.value) * 1000)}
            disabled={busy}
            className="w-20 rounded-lg border border-app-line bg-app-sunken px-2 py-1 text-sm text-app-ink outline-none focus:border-app-ink"
          />
          s
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={playing ? 'min-h-8 rounded-lg bg-red-500 px-2 text-xs font-semibold text-white transition hover:bg-red-400' : smallBtn} onClick={playing ? onStop : onSelect}>
            {playing ? '■ Stop' : '▶ Play shot'}
          </button>
          <button type="button" className={smallBtn} onClick={onSplit} disabled={busy || length < 800} title="Split at the playhead (or the middle)">Split</button>
          <button type="button" className={smallBtn} onClick={onMerge} disabled={busy || isLast} title="Merge with the next shot">Merge ↓</button>
          <button type="button" className={smallBtn} onClick={() => onMoveCut(-100)} disabled={busy || isLast} title="End this shot 0.1 s earlier">End −0.1</button>
          <button type="button" className={smallBtn} onClick={() => onMoveCut(100)} disabled={busy || isLast} title="End this shot 0.1 s later">End +0.1</button>
        </div>
      </div>
    </li>
  );
}
