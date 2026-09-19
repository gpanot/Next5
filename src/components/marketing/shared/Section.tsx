import type { ReactNode } from 'react';

type SectionProps = {
  id?: string;
  eyebrow?: string;
  title?: string;
  sub?: string;
  tone?: 'plain' | 'sunken';
  align?: 'left' | 'center';
  children: ReactNode;
  className?: string;
};

/** Marketing section with an optional eyebrow / display title / subtitle header. */
export const Section = ({ id, eyebrow, title, sub, tone = 'plain', align = 'left', children, className = '' }: SectionProps) => (
  <section id={id} className={`${tone === 'sunken' ? 'bg-app-sunken' : ''} px-5 py-12 sm:px-8 sm:py-24 ${className}`}>
    <div className="mx-auto max-w-6xl">
      {(eyebrow || title || sub) && (
        <header className={`mb-7 flex max-w-2xl flex-col gap-2.5 sm:mb-14 sm:gap-3 ${align === 'center' ? 'mx-auto items-center text-center' : ''}`}>
          {eyebrow && <p className="label-caps text-[11px] font-medium text-app-accent">{eyebrow}</p>}
          {title && (
            <h2 className="font-display text-[27px] font-semibold leading-[1.1] tracking-[-0.02em] text-balance text-app-ink sm:text-[36px]">
              {title}
            </h2>
          )}
          {sub && <p className="text-[16px] leading-snug text-app-muted sm:text-[17px] sm:leading-relaxed">{sub}</p>}
        </header>
      )}
      {children}
    </div>
  </section>
);
