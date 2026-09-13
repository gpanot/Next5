'use client';

import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import type { FaqItem } from '../../../content/business/marketing';

export const FaqAccordion = ({ items }: { items: readonly FaqItem[] }) => {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();

  return (
    <div className="mx-auto max-w-3xl divide-y divide-app-line border-y border-app-line">
      {items.map((item, index) => {
        const isOpen = open === index;
        const panelId = `${baseId}-panel-${index}`;
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left text-[16px] font-medium text-app-ink transition-colors duration-200 hover:text-app-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
              >
                {item.q}
                <ChevronDown aria-hidden className={`h-5 w-5 shrink-0 text-app-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
            </h3>
            <div id={panelId} hidden={!isOpen} className="pb-5 pr-9 text-[15px] leading-relaxed text-app-muted">
              {item.a}
            </div>
          </div>
        );
      })}
    </div>
  );
};
