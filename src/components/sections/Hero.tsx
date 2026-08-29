'use client';

import { heroFeatures, heroImage } from '../../data/site';
import { useLocale } from '../../i18n/LocaleContext';
import { ButtonLink } from '../ui/Button';
import { SparkleIcon } from '../ui/Icons';
import { PlaceholderImage } from '../ui/PlaceholderImage';

export const Hero = () => {
  const { locale, t } = useLocale();

  return (
    <section
      id="top"
      className="relative flex min-h-[620px] w-full items-center overflow-hidden lg:h-[92vh] lg:max-h-[860px]"
    >
      <PlaceholderImage
        src={heroImage}
        alt="Woman photographed on a Saigon rooftop at sunset"
        label="Hero photo"
        tone="dark"
        loading="eager"
        className="absolute inset-0 h-full w-full"
        imageClassName="object-[62%_center] lg:object-center"
      />

      <div
        className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/80 lg:bg-gradient-to-r lg:from-black/85 lg:via-black/50 lg:via-45% lg:to-transparent"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 hidden bg-gradient-to-t from-black/55 via-transparent to-black/30 lg:block"
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-[1240px] px-5 pt-28 pb-16 sm:px-8 lg:px-10 lg:pt-24 lg:pb-14">
        <div className="max-w-[640px]">
          <span className="label-caps inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-[9.5px] font-medium text-white backdrop-blur-sm sm:text-[10px]">
            <SparkleIcon className="h-3.5 w-3.5" />
            {t.hero.badge}
          </span>

          <h1 className="mt-7 font-serif text-[42px] leading-[1.04] font-light text-white sm:text-[56px] lg:text-[64px] xl:text-[70px]">
            {t.hero.headlineLine1}
            <br />
            {t.hero.headlineLine2}
            <br />
            <em className="text-[#e8cfb5] italic">{t.hero.headlineEm}</em>
          </h1>

          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-white/85 sm:text-base">
            {t.hero.subhead}
          </p>

          <ul className="mt-9 grid max-w-lg grid-cols-2 gap-x-6 gap-y-5 sm:flex sm:max-w-none sm:flex-wrap sm:gap-x-8">
            {heroFeatures.map(({ icon: Icon, lines }) => (
              <li key={lines.en[0]} className="flex items-center gap-2.5">
                <Icon className="h-5 w-5 shrink-0 text-white/80" />
                <span className="text-[11px] leading-[1.35] text-white/85 sm:text-[11.5px]">
                  {lines[locale][0]}
                  <br />
                  {lines[locale][1]}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <ButtonLink href="#routes" size="lg" withArrow className="">
              {t.common.createMyShoot}
            </ButtonLink>
            <p className="text-[12.5px] text-white/65">{t.hero.sequence}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
