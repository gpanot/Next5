import type { ReactNode } from 'react';

export const CreateSection = ({ step, title, sub, children }: { step: number; title: string; sub?: string; children: ReactNode }) => (
  <section className="flex flex-col gap-4 rounded-2xl border border-app-line bg-app-panel p-5 sm:p-6">
    <header className="flex items-baseline gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-[13px] font-semibold tabular-nums text-app-accent">{step}</span>
      <div>
        <h2 className="text-[17px] font-semibold text-app-ink">{title}</h2>
        {sub && <p className="text-[13px] text-app-muted">{sub}</p>}
      </div>
    </header>
    {children}
  </section>
);
