import type { AutoRunDto, AutoStep } from '../../../types/admin/autoSlideshow';

const clip = (text: string, max = 70) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** Lines built from what the run already knows about the brand, so the wait shows the agent is reading their site. */
const brandLines = (run: AutoRunDto): string[] => {
  const p = run.profile;
  const lines: string[] = [];
  if (p?.audience) lines.push(`Writing for: ${clip(p.audience)}`);
  if (p?.tone) lines.push(`Matching your ${p.tone.toLowerCase()} tone`);
  for (const lever of run.levers?.slice(0, 4) ?? []) lines.push(`Using your proof: “${clip(lever.claim)}”`);
  if (p?.productCategories.length) lines.push(`Covering ${p.productCategories.slice(0, 3).join(', ')}`);
  return lines;
};

/** What the agent does inside each long step, in order. */
const STEP_LINES: Partial<Record<AutoStep, string[]>> = {
  3: [
    'Looking at hooks that already got views',
    'Fitting each hook to your audience',
    'Writing slides that keep people swiping',
    'Picking a clear call to action',
    'Checking every number against your site',
    'Throwing out weak hooks',
    'Saving your hook bank so next time is fast',
  ],
  4: ['Writing slide 1 to stop the scroll', 'Keeping each slide short and easy to read', 'Writing captions and hashtags', 'Checking every number against your site'],
  5: ['Making bright, real-looking photos', 'Matching each photo to its slide', 'Leaving room for the text'],
  6: ['Putting text on each photo', 'Checking text fits on a phone screen'],
};

/** Rotating lines for the step running now: step work first, then brand facts, mixed so both show early. Empty when nothing to rotate. */
export const waitLines = (run: AutoRunDto, step: AutoStep): string[] => {
  const work = STEP_LINES[step] ?? [];
  if (work.length === 0) return [];
  const facts = brandLines(run);
  const mixed: string[] = [];
  for (let i = 0; i < Math.max(work.length, facts.length); i++) {
    if (work[i]) mixed.push(work[i]!);
    if (facts[i]) mixed.push(facts[i]!);
  }
  return mixed;
};
