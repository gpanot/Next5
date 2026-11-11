'use client';

import { pillarTopics, type Topics } from '../../../lib/blueprint/schema';
import { PILLARS } from '../../../lib/scriptGenerator/types';
import { PILLAR_COPY } from './copy';

/** Branch lines from the trunk to the three branches. Desktop only: on phones the branches stack. */
const Connectors = () => (
  <svg aria-hidden viewBox="0 0 300 40" preserveAspectRatio="none" className="hidden h-10 w-full text-app-line sm:block">
    <path d="M150 0 V16 M50 40 V16 H250 V40 M150 16 V40" fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
  </svg>
);

type BrandTreeProps = { topics: Topics; rootLabel: string };

/** The brand as a tree: the user at the root, Skills, Passions and Story as branches, one chip per topic (main ones first). */
export const BrandTree = ({ topics, rootLabel }: BrandTreeProps) => (
  <figure className="flex flex-col items-center rounded-2xl border border-app-line bg-app-panel p-4 shadow-sm sm:p-6">
    <figcaption className="rounded-full bg-app-ink px-4 py-2 text-[14px] font-semibold text-app-bg">{rootLabel}</figcaption>
    <div aria-hidden className="h-4 w-0.5 bg-app-line sm:hidden" />
    <Connectors />
    <div className="grid w-full gap-3 sm:grid-cols-3">
      {PILLARS.map((pillar) => {
        const { main, optional } = pillarTopics(topics[pillar]);
        const lines = [...main.map((text) => ({ text, main: true })), ...optional.map((text) => ({ text, main: false }))];
        return (
          <section key={pillar} aria-label={PILLAR_COPY[pillar].name} className="min-w-0 rounded-xl bg-app-sunken p-3">
            <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-app-ink">
              {PILLAR_COPY[pillar].name} <span className="font-normal normal-case text-app-muted">({lines.length})</span>
            </h3>
            {lines.length === 0 ? (
              <p className="text-[13px] text-app-muted">No topics yet</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {lines.map((line, i) => (
                  <li
                    key={`${line.text}-${i}`}
                    className={[
                      'max-w-full truncate rounded-full border px-2.5 py-1 text-[12px]',
                      line.main ? 'border-app-accent bg-app-panel font-medium text-app-ink' : 'border-dashed border-app-line text-app-muted',
                    ].join(' ')}
                  >
                    {line.text}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  </figure>
);
