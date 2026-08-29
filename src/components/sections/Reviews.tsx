'use client';

import { reviews } from '../../data/reviews';
import { useLocale } from '../../i18n/LocaleContext';
import { StarIcon } from '../ui/Icons';

const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase();

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

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <figure
              key={review.name}
              className="flex flex-col rounded-xl border border-line bg-page p-5 shadow-card"
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
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 font-serif text-[12px] text-accent-strong">
                  {initials(review.name)}
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
