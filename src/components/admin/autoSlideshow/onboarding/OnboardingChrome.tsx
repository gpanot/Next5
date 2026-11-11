'use client';

import type { ReactNode } from 'react';
import { FIRST_COUNTED_STEP, LAST_COUNTED_STEP } from '../../../../types/admin/onboarding';

export const TITLE_ID = 'onboarding-title';

const isCounted = (step: number) => step >= FIRST_COUNTED_STEP && step <= LAST_COUNTED_STEP;

function Wordmark() {
  return <span className="text-sm font-bold tracking-[0.18em] text-ink dark:text-zinc-100">NEXT5</span>;
}

/** Back arrow and "Step N of 5" on the question screens; the wordmark on the first and last. No Skip: every screen is answered. */
export function OnboardingHeader({ step, onBack }: { step: number; onBack: () => void }) {
  if (!isCounted(step)) {
    return (
      <div className="flex h-14 shrink-0 items-center justify-center border-b border-zinc-100 px-4 dark:border-zinc-800">
        <Wordmark />
      </div>
    );
  }
  return (
    <div className="grid h-14 shrink-0 grid-cols-[3rem_1fr_3rem] items-center border-b border-zinc-100 px-2 dark:border-zinc-800">
      <button onClick={onBack} aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-full text-ink transition hover:bg-zinc-100 active:scale-95 dark:text-zinc-100 dark:hover:bg-zinc-800">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <p className="text-center text-xs font-medium text-muted">
        Step {step} of {LAST_COUNTED_STEP}
      </p>
      {/* Keeps the step line centred. */}
      <span aria-hidden />
    </div>
  );
}

/** Real build progress. Once the build is done, a link lets the user leave the flow early. */
export function BuildBar({ pct, done, onJump }: { pct: number; done: boolean; onJump?: () => void }) {
  return (
    <div className="shrink-0 px-6 pt-3 pb-1">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-emerald-700 dark:text-emerald-400">{done ? 'Workspace ready' : 'Preparing your workspace'}</span>
        <span className="text-muted tabular-nums">{pct}%</span>
      </div>
      <div role="progressbar" aria-label="Workspace build" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-700 ease-out dark:bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
      {done && onJump && (
        <button onClick={onJump} className="mt-1 min-h-11 text-sm font-semibold text-blue-600 underline-offset-4 transition hover:underline dark:text-blue-400">
          Jump to my calendar
        </button>
      )}
    </div>
  );
}

type Cta = { label: string; onClick: () => void; disabled?: boolean };

type ScreenProps = { icon?: ReactNode; kicker?: string; title: string; subtitle?: string; titleClass?: string; cta: Cta; ctaNote?: string; children?: ReactNode };

/** One screen: a scrolling body under the title, the main button pinned at the bottom. */
export function Screen({ icon, kicker, title, subtitle, titleClass = 'text-[26px]', cta, ctaNote, children }: ScreenProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-5 pb-6">
        {icon}
        {kicker && <p className="mb-2 text-xs font-semibold tracking-wide text-blue-600 uppercase dark:text-blue-400">{kicker}</p>}
        <h2 id={TITLE_ID} tabIndex={-1} className={`font-heading leading-tight tracking-tight text-ink outline-none dark:text-zinc-100 ${titleClass}`}>
          {title}
        </h2>
        {subtitle && <p className="mt-2 text-[15px] text-muted">{subtitle}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
      <div className="shrink-0 border-t border-zinc-100 px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-zinc-800">
        <button
          onClick={cta.onClick}
          disabled={cta.disabled}
          className="h-[54px] w-full rounded-full bg-app-cta text-[15px] font-semibold text-app-cta-ink shadow-sm transition hover:bg-app-cta/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {cta.label}
        </button>
        {ctaNote && <p className="mt-2 text-center text-xs text-muted">{ctaNote}</p>}
      </div>
    </div>
  );
}
