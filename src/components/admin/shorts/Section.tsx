'use client';

import type { ReactNode } from 'react';

/** One titled card of the short's detail page. */
export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-app-line bg-app-panel p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-extrabold text-app-ink">{title}</h2>
        {aside && <div className="text-xs text-app-muted">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

/** A labeled block of long text (a prompt, the source facts), folded by default. */
export function Disclosure({ label, text, open = false }: { label: string; text: string; open?: boolean }) {
  return (
    <details open={open} className="group rounded-lg bg-app-sunken px-3 py-2">
      <summary className="cursor-pointer list-none text-xs font-bold text-app-muted select-none group-open:mb-2">
        <span className="mr-1 inline-block transition group-open:rotate-90">›</span>
        {label}
      </summary>
      <p className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-app-ink">{text}</p>
    </details>
  );
}
