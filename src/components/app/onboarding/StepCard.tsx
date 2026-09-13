import type { ReactNode } from 'react';

type StepCardProps = { title: string; sub?: string; children: ReactNode; footer?: ReactNode };

export const StepCard = ({ title, sub, children, footer }: StepCardProps) => (
  <section className="flex flex-col gap-6 rounded-3xl border border-app-line bg-app-panel p-5 shadow-sm sm:p-8">
    <header className="flex flex-col gap-1.5">
      <h1 className="font-serif text-[30px] font-medium leading-tight text-balance text-app-ink sm:text-[36px]">{title}</h1>
      {sub && <p className="text-[15px] leading-relaxed text-app-muted">{sub}</p>}
    </header>
    {children}
    {footer && <footer className="flex flex-col-reverse gap-3 border-t border-app-line pt-5 sm:flex-row sm:items-center sm:justify-end">{footer}</footer>}
  </section>
);
