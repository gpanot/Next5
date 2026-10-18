'use client';

/**
 * Last step: how many seconds to generate. For the swap modes the slider tops out at the whole
 * uploaded clip (capped by the model), and starts there; a shorter pick trims the clip at submit.
 */

import { Section } from '../ugcLab/ui';
import { estimateCost, MIN_DURATION_SEC, MODE_CONFIG, MODE_MAX_SEC, type CloneMode } from './cloneConfig';

type Props = {
  mode: CloneMode;
  value: number;
  max: number;
  onChange: (seconds: number) => void;
  /** Length of the uploaded clip, when there is one. */
  clipSec?: number;
};

export function CloneDurationSlider({ mode, value, max, onChange, clipSec }: Props) {
  const isSwap = mode !== 'video-update';
  const clipTooLong = isSwap && clipSec !== undefined && clipSec > MODE_MAX_SEC[mode] + 0.5;

  return (
    <Section
      title="6 · Duration"
      description={isSwap ? 'Output length = how much of the clip is used. Defaults to the whole clip.' : 'Seconds to generate'}
    >
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="clone-duration" className="text-[13px] font-medium text-ink">Duration (seconds)</label>
          <span className="min-w-12 rounded-lg bg-surface-alt px-3 py-1 text-center font-mono text-[15px] font-semibold text-ink">
            {value}
          </span>
        </div>
        <input
          id="clone-duration"
          type="range"
          min={MIN_DURATION_SEC}
          max={max}
          step={1}
          value={value}
          disabled={max <= MIN_DURATION_SEC}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-6 w-full cursor-pointer accent-ink disabled:cursor-not-allowed"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
          <span>
            {MIN_DURATION_SEC} to {max}
            {isSwap && clipSec ? ` · clip ${Math.round(clipSec)} s` : ` · model max ${MODE_MAX_SEC[mode]} s`}
          </span>
          <span className="font-medium text-ink">≈ {estimateCost(mode, value)}</span>
        </div>
        {isSwap && clipSec !== undefined && value < Math.floor(clipSec) && (
          <p className="text-[12px] text-muted">The clip is cut to its first {value} s when you generate.</p>
        )}
        {clipTooLong && (
          <p className="rounded-lg bg-orange-50 px-3 py-2 text-[12px] text-orange-800">
            {MODE_CONFIG[mode].label} takes at most {MODE_MAX_SEC[mode]} s, so only the first {MODE_MAX_SEC[mode]} s of the clip can be used.
          </p>
        )}
      </div>
    </Section>
  );
}

