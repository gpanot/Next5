'use client';

import { useEffect, useState } from 'react';
import { heroFeatures, heroImage } from '../../data/site';
import { useLocale } from '../../i18n/LocaleContext';
import { ButtonLink } from '../ui/Button';
import { SparkleIcon, StarIcon } from '../ui/Icons';
import { PlaceholderImage } from '../ui/PlaceholderImage';

const PLATFORMS = ['Instagram', 'Facebook', 'TikTok'] as const;
const LONGEST_PLATFORM_CH = Math.max(...PLATFORMS.map((word) => word.length));
const TYPE_MS = 65;
const DELETE_MS = 35;
const HOLD_MS = 1400;
const GAP_MS = 250;

function PlatformCycler() {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<'typing' | 'deleting'>('typing');
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);
    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      const tick = setInterval(() => setIndex((i) => (i + 1) % PLATFORMS.length), 2400);
      return () => clearInterval(tick);
    }

    const word = PLATFORMS[index];
    let timeout: ReturnType<typeof setTimeout>;

    if (phase === 'typing') {
      if (text.length < word.length) {
        timeout = setTimeout(() => setText(word.slice(0, text.length + 1)), TYPE_MS);
      } else {
        timeout = setTimeout(() => setPhase('deleting'), HOLD_MS);
      }
    } else {
      if (text.length > 0) {
        timeout = setTimeout(() => setText(text.slice(0, -1)), DELETE_MS);
      } else {
        timeout = setTimeout(() => {
          setIndex((i) => (i + 1) % PLATFORMS.length);
          setPhase('typing');
        }, GAP_MS);
      }
    }

    return () => clearTimeout(timeout);
  }, [text, phase, index, reducedMotion]);

  if (reducedMotion) {
    return <span className="font-semibold">{PLATFORMS[index]}</span>;
  }

  return (
    <span className="inline-flex items-baseline" style={{ minWidth: `${LONGEST_PLATFORM_CH}ch` }}>
      <span aria-hidden="true" className="font-semibold">
        {text}
        <span className="animate-caret-blink ml-0.5 inline-block h-[0.8em] w-[2px] translate-y-[0.08em] bg-[#e8cfb5]" />
      </span>
      <span className="sr-only">{PLATFORMS[index]}</span>
    </span>
  );
}

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

      <div className="relative mx-auto w-full max-w-[1240px] px-5 pt-24 pb-10 sm:px-8 sm:pt-28 sm:pb-16 lg:px-10 lg:pt-24 lg:pb-14">
        <div className="max-w-[640px]">
          <span className="label-caps inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-[9.5px] font-medium text-white backdrop-blur-sm sm:text-[10px]">
            <SparkleIcon className="h-3.5 w-3.5" />
            {t.hero.badge}
          </span>

          <h1 className="mt-7 font-serif text-[42px] leading-[1.04] font-light text-white sm:text-[56px] lg:text-[64px] xl:text-[70px]">
            {t.hero.headlineLine1}
            <br />
            <PlatformCycler />{' '}photos.
            <br />
            <em className="text-[#e8cfb5] italic">{t.hero.headlineEm}</em>
          </h1>

          <div className="mt-6">
            <p className="text-[18px] font-semibold leading-snug text-white sm:text-[20px]">
              One selfie. Five professional-looking photos.
            </p>
            <p className="mt-1 text-[18px] font-semibold leading-snug text-white sm:text-[20px]">
              See the first one free.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              {['No photographer', 'No travel', 'No stress'].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#e8cfb5]/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#e8cfb5]" />
                  </span>
                  <span className="text-[13px] text-white/85">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-4 sm:mt-9 sm:gap-x-8">
            {heroFeatures.map(({ icon: Icon, lines }) => (
              <li key={lines.en[0]} className="flex items-center gap-2.5">
                <Icon className="h-5 w-5 shrink-0 text-white/80" />
                <span className="text-[11px] leading-[1.35] text-white/85 sm:text-[11.5px]">
                  <span className="font-semibold text-white">{lines[locale][0]}</span>
                  <br />
                  {lines[locale][1]}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-6">
            <ButtonLink href="#routes" size="lg" withArrow className="">
              {t.common.createMyShoot}
            </ButtonLink>
          </div>

          <div className="mt-3 flex items-center gap-2 sm:mt-5">
            <span className="flex gap-0.5 text-[#e8cfb5]" aria-hidden="true">
              {Array.from({ length: 5 }, (_, index) => (
                <StarIcon key={index} className="h-3.5 w-3.5" />
              ))}
            </span>
            <span className="text-[12px] font-medium text-white/85">4.9</span>
            <span className="text-[12px] text-white/60">{t.socialProof.reviews}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
