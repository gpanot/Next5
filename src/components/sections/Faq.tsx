'use client';

import { useState } from 'react';
import { useLocale } from '../../i18n/LocaleContext';
import { ChevronDownIcon } from '../ui/Icons';

export const Faq = () => {
  const { t } = useLocale();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-20 bg-page py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[720px] px-5 sm:px-8 lg:px-10">
        <p className="label-caps text-center text-[9.5px] font-medium text-accent-strong">
          {t.faq.eyebrow}
        </p>
        <h2 className="mt-2 text-center font-serif text-[26px] uppercase tracking-[0.08em] text-ink sm:text-[30px]">
          {t.faq.title}
        </h2>

        <div className="mt-10 divide-y divide-line border-y border-line">
          {t.faq.items.map((item, index) => {
            const open = openIndex === index;

            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : index)}
                  aria-expanded={open}
                  aria-controls={`faq-answer-${index}`}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="text-[14.5px] font-medium text-ink">{item.q}</span>
                  <ChevronDownIcon
                    className={`h-4.5 w-4.5 shrink-0 text-muted transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                  />
                </button>

                {open && (
                  <p id={`faq-answer-${index}`} className="pb-5 text-[13px] leading-relaxed text-muted">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
