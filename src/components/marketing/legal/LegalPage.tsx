import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

export type LegalSection = { heading: string; body: readonly ReactNode[] };

type LegalPageProps = { title: string; updated: string; intro: string; sections: readonly LegalSection[] };

export const LegalPage = ({ title, updated, intro, sections }: LegalPageProps) => (
  <article className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-12 sm:px-8 sm:py-16">
    <p role="note" className="flex items-start gap-2 rounded-xl border border-app-warning/40 bg-app-warning/10 px-4 py-3 text-[14px] text-app-ink">
      <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-app-warning" />
      Draft pending legal review. This text will be reviewed by a Vietnamese lawyer before Next5 Brand and Next5 Shop launch publicly.
    </p>
    <header className="flex flex-col gap-3">
      <h1 className="font-serif text-[40px] font-medium leading-tight text-app-ink sm:text-[48px]">{title}</h1>
      <p className="text-[13px] text-app-muted">Last updated {updated}</p>
      <p className="text-[16px] leading-relaxed text-app-muted">{intro}</p>
    </header>
    {sections.map((section) => (
      <section key={section.heading} className="flex flex-col gap-3">
        <h2 className="text-[20px] font-semibold text-app-ink">{section.heading}</h2>
        {section.body.map((paragraph, i) => <p key={i} className="text-[15px] leading-relaxed text-app-ink">{paragraph}</p>)}
      </section>
    ))}
    <p className="text-[14px] text-app-muted">Questions? Email <a className="font-medium text-app-accent" href="mailto:hello@next5.studio">hello@next5.studio</a>.</p>
  </article>
);
