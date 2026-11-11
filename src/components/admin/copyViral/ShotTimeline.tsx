'use client';

import type { CopyViralShotEdit } from '../../../types/admin/copyViral';

/**
 * The reel as one bar, a block per shot sized by its length, and the playhead. Click a block to jump to it.
 * `done` marks shots that already have a take (green line under the block).
 */
export function ShotTimeline({ shots, durationMs, playheadMs, selected, onSelect, done }: {
  shots: CopyViralShotEdit[];
  durationMs: number;
  playheadMs: number;
  selected: number | null;
  onSelect: (index: number) => void;
  done?: boolean[];
}) {
  if (durationMs <= 0) return null;
  return (
    <div className="relative flex h-10 w-full overflow-hidden rounded-lg bg-app-sunken">
      {shots.map((s, i) => (
        <button
          key={`${s.startMs}-${s.endMs}`}
          type="button"
          onClick={() => onSelect(i)}
          style={{ width: `${((s.endMs - s.startMs) / durationMs) * 100}%` }}
          className={`h-full border-r border-app-panel text-[11px] font-bold transition ${selected === i ? 'bg-app-ink text-app-panel' : 'text-app-muted hover:bg-app-line'} ${done?.[i] ? 'border-b-4 border-b-green-500' : ''}`}
          title={`Shot ${i + 1}`}
        >
          {i + 1}
        </button>
      ))}
      <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-app-danger" style={{ left: `${(playheadMs / durationMs) * 100}%` }} />
    </div>
  );
}
