'use client';

import { useEffect, useState } from 'react';
import { resultPhotos } from '../../data/results';
import { useLocale } from '../../i18n/LocaleContext';
import { PlaceholderImage } from '../ui/PlaceholderImage';

const VISIBLE_COUNT = 5;

/** Fisher-Yates, good enough for picking a display order out of 7 photos. */
const shuffled = <T,>(items: readonly T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/**
 * Answers "will it actually look like me?" before she reads a word of copy —
 * real-style studio shots, right under the hero. Shows the first 5 photos on
 * the server render, then picks a random 5-of-7 once mounted, so there's no
 * hydration mismatch from randomising on the server.
 */
export const ProofStrip = () => {
  const { t } = useLocale();
  const [visible, setVisible] = useState(() => resultPhotos.slice(0, VISIBLE_COUNT));

  useEffect(() => {
    setVisible(shuffled(resultPhotos).slice(0, VISIBLE_COUNT));
  }, []);

  return (
    <section className="bg-page py-14 sm:py-16">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <p className="label-caps text-center text-[9.5px] font-medium text-accent-strong">
          {t.proofStrip.eyebrow}
        </p>
        <h2 className="mt-2 text-center font-serif text-[24px] text-ink sm:text-[28px]">
          {t.proofStrip.title}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-center text-[12.5px] text-muted">
          {t.proofStrip.subtitle}
        </p>

        <div className="mt-8 flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-5 sm:gap-4 sm:overflow-visible sm:pb-0">
          {visible.map((src) => (
            <div
              key={src}
              className="aspect-[3/4] w-[150px] shrink-0 overflow-hidden rounded-xl shadow-card sm:w-auto"
            >
              <PlaceholderImage
                src={src}
                alt="Real Next5 studio result"
                className="h-full w-full"
                imageClassName="object-center"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
