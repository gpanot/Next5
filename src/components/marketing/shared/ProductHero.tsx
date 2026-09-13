import type { ReactNode } from 'react';
import { CtaLink } from './CtaLink';

type ProductHeroProps = {
  eyebrow: string;
  title: string;
  sub: string;
  cta: { href: string; label: string };
  secondary?: { href: string; label: string };
  note?: string;
  visual: ReactNode;
};

/** Two-column hero: copy left, product visual right (stacks on phones). */
export const ProductHero = ({ eyebrow, title, sub, cta, secondary, note, visual }: ProductHeroProps) => (
  <section className="px-5 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-16">
    <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
      <div className="flex flex-col items-start gap-6">
        <p className="label-caps rounded-full border border-app-line bg-app-panel px-3 py-1.5 text-[10px] font-medium text-app-accent">{eyebrow}</p>
        <h1 className="font-serif text-[42px] font-medium leading-[1.02] tracking-[-0.015em] text-balance text-app-ink sm:text-[56px] lg:text-[62px]">
          {title}
        </h1>
        <p className="max-w-xl text-[17px] leading-relaxed text-app-muted sm:text-[18px]">{sub}</p>
        <div className="flex flex-wrap items-center gap-3">
          <CtaLink href={cta.href}>{cta.label}</CtaLink>
          {secondary && <CtaLink href={secondary.href} variant="ghost">{secondary.label}</CtaLink>}
        </div>
        {note && <p className="text-[13px] text-app-muted">{note}</p>}
      </div>
      {visual}
    </div>
  </section>
);
