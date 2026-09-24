'use client';

import {
  UGC_MAX_WORDS, countWords, estimateSeedanceUsd, speakingSeconds, type UgcDuration,
} from '../../../config/ugcLab';
import { PrimaryButton, fieldClass, usd } from './ui';

export type ScriptOption = { duration: UgcDuration; text: string; words: number };

const DURATION_LABELS: Record<UgcDuration, string> = {
  8: '8 s · hook only',
  16: '16 s · hook + context',
  24: '24 s · full pitch',
};

export const LengthNote = ({ text, duration }: { text: string; duration: UgcDuration }) => {
  const words = countWords(text);
  const over = words > UGC_MAX_WORDS[duration];
  return (
    <span className={`text-[11px] tabular-nums ${over ? 'text-red-700' : 'text-muted'}`}>
      {words} words · about {speakingSeconds(text)} s to say{over ? ` · too long for ${duration} s (max ${UGC_MAX_WORDS[duration]})` : ''}
    </span>
  );
};

type ScriptPickerProps = {
  scripts: ScriptOption[];
  selected: UgcDuration | null;
  edited: string;
  onSelect: (script: ScriptOption) => void;
  onEdit: (text: string) => void;
  onConfirm: () => void;
};

/** Three script lengths to pick from, then an editor with a live length check. */
export function ScriptPicker({ scripts, selected, edited, onSelect, onEdit, onConfirm }: ScriptPickerProps) {
  const tooLong = selected !== null && countWords(edited) > UGC_MAX_WORDS[selected];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] uppercase tracking-widest text-muted">Pick a script — it sets the video length</p>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {scripts.map((s) => (
          <button
            key={s.duration}
            type="button"
            onClick={() => onSelect(s)}
            aria-pressed={selected === s.duration}
            className={`flex flex-col gap-2 rounded-xl border bg-white p-3 text-left transition-shadow ${
              selected === s.duration ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-ink/40'
            }`}
          >
            <span className="flex items-center justify-between text-[12px] font-medium text-ink">
              {DURATION_LABELS[s.duration]}
              <span className="text-muted tabular-nums">{usd(estimateSeedanceUsd(s.duration))}</span>
            </span>
            <span className="text-[13px] leading-relaxed text-ink">{s.text}</span>
            <LengthNote text={s.text} duration={s.duration} />
          </button>
        ))}
      </div>

      {selected !== null && (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-[12px] font-medium text-muted">
            Edit the script
            <textarea value={edited} onChange={(e) => onEdit(e.target.value)} rows={4} className={`${fieldClass} resize-none`} />
          </label>
          <LengthNote text={edited} duration={selected} />
          <div>
            <PrimaryButton onClick={onConfirm} disabled={!edited.trim() || tooLong}>
              Use this {selected} s script
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
}
