import { ArrowRight, Check } from 'lucide-react';
import { CALENDAR_HERO, type HeroAudience } from '../../../content/business/home';
import { OFFER_HOME } from '../../../content/business/offer';
import { PlatformMarks } from '../offer/PlatformMarks';
import { CtaLink } from '../shared/CtaLink';
import { AudienceOnly, AudienceProvider, AudienceToggle } from './AudienceSwitch';
import { HeroCalendar } from './HeroCalendar';

const AUDIENCES: HeroAudience[] = ['realtor', 'shop'];

/**
 * Calendar-first hero. Copy and a buyer switch on the left, the month we fill on the right.
 * On phones the calendar sits right under the switch, so the first screen shows the product.
 */
export const CalendarHero = () => {
  const now = new Date();
  return (
    <AudienceProvider>
      <section id="start" className="relative scroll-mt-16 overflow-hidden px-4 pb-16 pt-6 sm:px-8 sm:pb-28 sm:pt-14">
        {/* Ambient gradient — slow fade-in so it doesn't pop */}
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[480px] bg-[radial-gradient(60%_60%_at_70%_0%,var(--color-app-accent-soft),transparent)] animate-hero-bg" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
          <div className="flex flex-col items-start gap-5 sm:gap-6">
            {/* Badge */}
            <p className="inline-flex items-center gap-2 rounded-full border border-app-line bg-app-panel px-3 py-1 text-[12px] font-medium text-app-ink shadow-sm sm:text-[13px] animate-hero-1">
              <span className="h-1.5 w-1.5 rounded-full bg-app-accent animate-pulse" aria-hidden />{CALENDAR_HERO.badge}
            </p>
            {/* Headline */}
            <h1 className="font-display text-[36px] font-bold leading-[1.02] tracking-[-0.035em] text-balance text-app-ink sm:text-[54px] lg:text-[62px] animate-hero-2">{CALENDAR_HERO.title}</h1>
            {/* Sub */}
            <p className="max-w-xl text-[17px] leading-relaxed text-app-muted sm:text-[19px] animate-hero-3">{CALENDAR_HERO.sub}</p>
            {/* Audience toggle */}
            <div className="animate-hero-4 w-full">
              <AudienceToggle label={CALENDAR_HERO.switchLabel} tabs={CALENDAR_HERO.tabs} />
            </div>
            {/* CTA */}
            <div className="w-full sm:w-auto animate-hero-5">
              {AUDIENCES.map((id) => (
                <AudienceOnly key={id} audience={id}>
                  <CtaLink href={CALENDAR_HERO.audiences[id].cta.href} className="w-full gap-2 sm:w-auto">
                    {CALENDAR_HERO.audiences[id].cta.label} <ArrowRight aria-hidden className="h-4 w-4" />
                  </CtaLink>
                </AudienceOnly>
              ))}
            </div>
            {/* Trust badges */}
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 animate-hero-6">
              {CALENDAR_HERO.trust.map((item) => (
                <li key={item} className="flex items-center gap-1.5 text-[13px] text-app-ink sm:text-[14px]">
                  <Check aria-hidden className="h-4 w-4 text-app-success" /> {item}
                </li>
              ))}
            </ul>
            <PlatformMarks platforms={OFFER_HOME.platforms} className="hidden lg:flex animate-hero-6" />
          </div>
          {/* Calendar — slides in from the right */}
          <div className="lg:pl-6 animate-hero-right">
            {AUDIENCES.map((id) => (
              <AudienceOnly key={id} audience={id}>
                <HeroCalendar content={CALENDAR_HERO.audiences[id]} now={now} />
              </AudienceOnly>
            ))}
          </div>
        </div>
      </section>
    </AudienceProvider>
  );
};
