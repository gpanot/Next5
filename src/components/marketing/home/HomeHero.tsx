import { Check } from 'lucide-react';
import { HOME_HERO } from '../../../content/business/home';
import { OFFER_HOME } from '../../../content/business/offer';
import { PlatformMarks } from '../offer/PlatformMarks';
import { AudienceDoor } from './AudienceDoor';

/**
 * Photo-first hero. People look, they don't read: one short headline, then two big photos that are the buttons.
 * Both photos sit in the first phone screen, side by side.
 */
export const HomeHero = () => (
  <section id="start" className="scroll-mt-16 px-4 pb-12 pt-5 sm:px-8 sm:pb-20 sm:pt-10">
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 text-center sm:gap-7">
      <div className="flex flex-col items-center gap-2 sm:gap-3">
        <h1 className="font-display text-[34px] font-semibold leading-[1.05] tracking-[-0.025em] text-balance text-app-ink sm:text-[52px] lg:text-[60px]">{HOME_HERO.title}</h1>
        <p className="text-[17px] text-app-muted sm:text-[20px]">{HOME_HERO.sub}</p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:gap-3">
        <p className="text-[14px] font-medium text-app-ink sm:text-[15px]">{HOME_HERO.pick}</p>
        <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-3 sm:gap-5">
          {HOME_HERO.doors.map((door) => <AudienceDoor key={door.id} door={door} priority />)}
        </div>
      </div>
      <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {HOME_HERO.trust.map((item) => (
          <li key={item} className="flex items-center gap-1.5 text-[14px] text-app-ink sm:text-[15px]">
            <Check aria-hidden className="h-4 w-4 text-app-success" /> {item}
          </li>
        ))}
      </ul>
      <PlatformMarks platforms={OFFER_HOME.platforms} className="hidden justify-center sm:flex" />
    </div>
  </section>
);
