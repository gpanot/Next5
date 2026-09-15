import type { ReactNode } from 'react';
import type { PlatformId } from '../../../content/business/offer';
import { CtaLink } from '../shared/CtaLink';
import { PlatformMarks } from './PlatformMarks';

type OfferHeroProps = {
  eyebrow: string;
  title: string;
  sub: string;
  cta: { href: string; label: string };
  secondary?: { href: string; label: string };
  note: string;
  platforms: readonly PlatformId[];
  visual: ReactNode;
};

/**
 * Mobile-first hero: on phones the visual sits right under the headline, so the first screen shows what Next5 makes.
 * On desktop: copy left, visual right.
 */
export const OfferHero = ({ eyebrow, title, sub, cta, secondary, note, platforms, visual }: OfferHeroProps) => (
  <section className="px-5 pb-14 pt-6 sm:px-8 sm:pb-24 sm:pt-14">
    <div className="mx-auto grid max-w-6xl gap-x-16 gap-y-6 lg:grid-cols-[1.05fr_1fr] lg:items-center">
      <div className="flex flex-col items-start gap-3 lg:col-start-1 lg:row-start-1 lg:self-end">
        <p className="label-caps text-[10px] font-medium text-app-accent">{eyebrow}</p>
        <h1 className="font-display text-[32px] font-semibold leading-[1.05] tracking-[-0.025em] text-balance text-app-ink sm:text-[46px] lg:text-[52px]">{title}</h1>
        <PlatformMarks platforms={platforms} className="lg:hidden" />
      </div>
      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">{visual}</div>
      <div className="flex flex-col items-start gap-5 lg:col-start-1 lg:row-start-2 lg:self-start">
        <p className="max-w-xl text-[17px] leading-relaxed text-app-muted sm:text-[18px]">{sub}</p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <CtaLink href={cta.href} className="w-full sm:w-auto">{cta.label}</CtaLink>
          {secondary && <CtaLink href={secondary.href} variant="ghost">{secondary.label}</CtaLink>}
        </div>
        <p className="text-[13px] text-app-muted">{note}</p>
        <PlatformMarks platforms={platforms} className="hidden lg:flex" />
      </div>
    </div>
  </section>
);
