'use client';

import { HOOK_PARTS, type HookPart } from '../../../lib/kallaway/types';
import { eyebrowClass, softCard } from '../scriptGenerator/ui';
import { PART_STYLE } from './partStyles';

const HELP: Record<HookPart, string> = {
  subject: 'Who does it: I, we, you, or a named thing.',
  action: 'The verb the subject does.',
  objective: 'The end result. Surprising and specific.',
  contrast: 'Base state today vs the new reality.',
  proof: 'Optional. Why trust this (again, 300 posts).',
  time: 'Optional. A time limit or speed (in 90 days).',
};

/** Kallaway's 6 hook power words, as a reusable cheat sheet. */
export function FormulaCard() {
  return (
    <section className={`${softCard} space-y-4`}>
      <p className={eyebrowClass}>The formula</p>
      <p className="text-base font-bold text-app-ink">[Subject] + [Action] + [Objective, with Contrast] + optional [Proof] + optional [Time]</p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {HOOK_PARTS.map((p, i) => (
          <li key={p} className="flex items-start gap-2 rounded-xl bg-app-sunken p-3">
            <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${PART_STYLE[p].mark}`}>{i + 1}. {PART_STYLE[p].label}</span>
            <span className="text-xs text-app-muted">{HELP[p]}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-app-muted">Example: “If <b>I</b> had to <b>grow</b> from <b>0 to 100K subs</b> on YouTube <b>again</b>, here’s how I’d do it <b>in 90 days</b>.”</p>
    </section>
  );
}
