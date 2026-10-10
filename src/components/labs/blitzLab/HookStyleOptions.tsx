'use client';

import { StyleThumb } from './captionStyles';
import { HOOK_STYLES, type HookStyleId } from './hookStyles';

type Props = {
  /** The look in use; null when none of them matches (tuned by hand). */
  activeId: HookStyleId | null;
  onPick: (id: HookStyleId) => void;
  disabled?: boolean;
  /** `dark`: on an always-dark surface (the slideshow editor), whatever the site theme. */
  tone?: 'auto' | 'dark';
};

const item = 'flex min-h-11 w-full items-center gap-2.5 rounded-xl border px-2 py-1.5 text-left transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100';

const TONES = {
  auto: {
    on: 'border-orange-400 bg-orange-50 shadow-sm dark:border-orange-500 dark:bg-orange-950/40',
    off: 'border-transparent hover:border-line hover:bg-zinc-50 dark:hover:border-zinc-700 dark:hover:bg-zinc-800',
    label: 'text-ink dark:text-zinc-100',
  },
  dark: {
    on: 'border-orange-500 bg-orange-500/15 shadow-sm',
    off: 'border-white/10 hover:border-white/25 hover:bg-white/5',
    label: 'text-white',
  },
} as const;

/** The hook / CTA looks (Default, White box, TikTok Red) as picks: the Ideas deck's Hook menu and both editors. */
export function HookStyleOptions({ activeId, onPick, disabled = false, tone = 'auto' }: Props) {
  const colors = TONES[tone];
  return (
    <div role="radiogroup" aria-label="Hook + CTA style" className="flex flex-col gap-0.5">
      {HOOK_STYLES.map((style) => {
        const active = activeId === style.id;
        return (
          <button
            key={style.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onPick(style.id)}
            className={`${item} ${active ? colors.on : colors.off}`}
          >
            <StyleThumb style={style} />
            <span className={`text-[12px] font-medium ${colors.label}`}>{style.label}</span>
            {active && <span aria-hidden className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />}
          </button>
        );
      })}
    </div>
  );
}
