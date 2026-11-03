'use client';

import { TEXT_SIZES } from '../../../types/slideText';

type Props = {
  /** Which slides a pick reaches, e.g. "Every content slide". */
  scope: string;
  value: number;
  onPick: (size: number) => void;
};

/** The text size dropdown (slideshow and campaign editors): a pick shows at once on every slide of the open tab's kind. */
export function TextSizeMenu({ scope, value, onPick }: Props) {
  return (
    <label title={`Text size · ${scope}`} className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 pl-2.5 transition hover:border-white/30 focus-within:border-emerald-400/70">
      <span aria-hidden className="text-xs font-extrabold text-white/70">Aa</span>
      <select
        aria-label={`Text size, ${scope}`}
        value={value}
        onChange={(e) => onPick(Number(e.target.value))}
        className="h-full cursor-pointer rounded-xl bg-transparent pr-1.5 text-base font-medium text-white/80 focus:outline-none sm:text-xs"
      >
        {TEXT_SIZES.map((s) => (
          <option key={s.value} value={s.value} className="bg-zinc-900 text-white">{s.label}</option>
        ))}
      </select>
    </label>
  );
}
