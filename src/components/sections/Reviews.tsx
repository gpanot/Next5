'use client';

import { reviews } from '../../data/reviews';
import { useLocale } from '../../i18n/LocaleContext';
import { StarIcon } from '../ui/Icons';

export const Reviews = () => {
  const { locale, t } = useLocale();

  return (
    <section className="bg-surface-alt py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <p className="label-caps text-center text-[9.5px] font-medium text-accent-strong">
          {t.reviews.eyebrow}
        </p>
        <h2 className="mt-2 text-center font-serif text-[26px] uppercase tracking-[0.08em] text-ink sm:text-[30px]">
          {t.reviews.title}
        </h2>

        <div className="mt-10 flex flex-wrap justify-center gap-5">
          {reviews.map((review) => (
            <figure
              key={review.name}
              className="flex w-full flex-col rounded-xl border border-line bg-page p-5 shadow-card sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]"
            >
              <span className="flex gap-0.5 text-accent" aria-hidden="true">
                {Array.from({ length: 5 }, (_, index) => (
                  <StarIcon key={index} className="h-3.5 w-3.5" />
                ))}
              </span>

              <blockquote className="mt-3 flex-1 text-[13px] leading-relaxed text-ink">
                “{review.quote[locale]}”
              </blockquote>

              <figcaption className="mt-4 flex items-center gap-2.5 border-t border-line pt-4">
                <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-accent/15">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={review.avatar} alt="" className="h-full w-full object-cover" />
                </span>
                <span>
                  <span className="block text-[12.5px] font-medium text-ink">{review.name}</span>
                  <span className="block text-[11px] text-muted">{review.studio}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};
