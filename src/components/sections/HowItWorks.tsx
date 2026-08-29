'use client';

import { howItWorksSteps } from '../../data/site';
import { useLocale } from '../../i18n/LocaleContext';
import { SectionHeading } from '../ui/SectionHeading';

export const HowItWorks = () => {
  const { locale } = useLocale();

  return (
    <section id="how-it-works" className="scroll-mt-20 bg-surface-alt py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <SectionHeading title={locale === 'vi' ? 'Cách hoạt động' : 'How it works'} />

        <ol className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
          {howItWorksSteps.map((step, index) => (
            <li key={step.step} className="relative flex flex-col items-center text-center">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eee0d1] font-serif text-[13px] font-medium text-ink">
                  {step.step}
                </span>
                <step.icon className="h-9 w-9 text-ink" strokeWidth={1.2} />
              </div>

              {index < howItWorksSteps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute top-4 left-[calc(50%+58px)] right-[calc(-50%+58px)] hidden items-center lg:flex"
                >
                  <span className="h-px flex-1 border-t border-dashed border-ink/25" />
                  <span className="h-0 w-0 border-y-[3.5px] border-l-[5px] border-transparent border-l-ink/35" />
                </span>
              )}

              <h3 className="label-caps mt-6 text-[11px] font-medium text-ink">{step.title[locale]}</h3>
              <p className="mt-2.5 text-[11.5px] leading-[1.6] text-muted">
                {step.description[locale][0]}
                <br />
                {step.description[locale][1]}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};
