import type { ReactNode } from 'react';
import { SCRIPT_MODELS, type ScriptModel } from '../../../types/admin/scriptGenerator';

/** Shared look of the Script Generator: soft white cards on a gray page, amber accents. */

export const amberTag = 'shrink-0 rounded-md bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-400/15 dark:text-amber-300';
export const eyebrowClass = 'text-[11px] font-semibold tracking-widest text-app-muted uppercase';
export const softCard = 'rounded-2xl bg-app-panel p-5 shadow-sm';
export const optionCard = 'w-full rounded-2xl bg-app-panel p-5 text-left shadow-sm ring-1 ring-transparent transition hover:ring-amber-400 active:scale-[0.99] disabled:opacity-60';
export const primaryBtn = 'min-h-12 rounded-xl bg-app-cta px-6 text-sm font-semibold text-app-cta-ink shadow-sm transition active:scale-[0.98] disabled:opacity-40';
export const secondaryBtn = 'min-h-12 rounded-xl bg-app-panel px-5 text-sm font-semibold text-app-ink shadow-sm transition active:scale-[0.98] disabled:opacity-40';
export const backBtn = 'inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-app-ink transition hover:text-app-muted disabled:opacity-40';

const sparkle = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7L12 2zM19 15l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5z" />
  </svg>
);

export function ToolPill() {
  return <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-[11px] font-bold tracking-wider text-amber-800 uppercase dark:bg-amber-400/15 dark:text-amber-300">{sparkle}AI Tool</span>;
}

export function BackButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={backBtn}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
      {label}
    </button>
  );
}

/** One thin bar per step; filled up to and including `current` (0-based). */
export function ProgressBar({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex gap-2" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current + 1}>
      {Array.from({ length: total }, (_, i) => <i key={i} className={`h-[3px] flex-1 rounded-full ${i <= current ? 'bg-amber-500' : 'bg-app-line'}`} />)}
    </div>
  );
}

export function StepFrame({ eyebrow, title, help, progress, children }: { eyebrow: string; title: string; help?: string; progress?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-5">
      <p className={`${eyebrowClass} pt-2`}>{eyebrow}</p>
      {progress}
      <h2 className="text-2xl font-extrabold tracking-tight text-app-ink md:text-3xl">{title}</h2>
      {help && <p className="max-w-2xl text-base text-app-muted">{help}</p>}
      {children}
    </div>
  );
}

/** Picks the text model. Can change at any step; the next call uses it. */
export function ModelPicker({ value, onChange }: { value: ScriptModel; onChange: (m: ScriptModel) => void }) {
  return (
    <div className="space-y-2">
      <p className={eyebrowClass}>Model</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {(Object.keys(SCRIPT_MODELS) as ScriptModel[]).map((m) => (
          <button key={m} type="button" onClick={() => onChange(m)} aria-pressed={value === m} className={`rounded-xl bg-app-panel px-4 py-3 text-left shadow-sm ring-1 transition active:scale-[0.99] ${value === m ? 'ring-amber-500' : 'ring-transparent hover:ring-amber-400'}`}>
            <p className="text-sm font-bold text-app-ink">{SCRIPT_MODELS[m].label}</p>
            <p className="text-[11px] text-app-muted">{SCRIPT_MODELS[m].detail}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
