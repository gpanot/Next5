import type { ReactNode } from 'react';

export type LegalSection = { heading: string; body: readonly ReactNode[] };

type LegalPageProps = { title: string; updated: string; intro: string; sections: readonly LegalSection[] };

export const LegalPage = ({ title, updated, intro, sections }: LegalPageProps) => (
  <article className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-12 sm:px-8 sm:py-16">
    <header className="flex flex-col gap-3">
      <h1 className="font-display text-[34px] font-semibold leading-tight tracking-[-0.02em] text-app-ink sm:text-[42px]">{title}</h1>
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
