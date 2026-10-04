import { AUTO_STEP_LABELS, AUTO_STEPS, currentAutoStep, type AutoRunDto, type AutoStep } from '../../../types/admin/autoSlideshow';
import type { LogLine } from '../shared/AgentLog';
import type { NavItem } from '../shared/PipelineNav';
import { stepState } from '../shared/PipelineNav';
import { stepSeconds as seconds } from '../shared/runClock';
import type { RunTitleCopy } from '../shared/RunTitle';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const domainOf = (run: AutoRunDto) => run.url.replace(/^https?:\/\//, '');
const brandOf = (run: AutoRunDto) => run.profile?.brandName ?? domainOf(run);
const readyCount = (run: AutoRunDto) => run.slideshows.filter((s) => s.status === 'ready').length;

/** Step running now, or the failed step when the run stopped. */
export const runStep = (run: AutoRunDto) => (run.status === 'FAILED' ? run.failedStep ?? 0 : currentAutoStep(run.status));

export const navItems = (run: AutoRunDto): NavItem[] =>
  AUTO_STEPS.map((step) => ({ label: AUTO_STEP_LABELS[step], state: stepState(runStep(run), run.status === 'FAILED', [step]) }));

/** What the agent is doing now, per step: [title, subtitle]. */
const activeCopy = (run: AutoRunDto, step: AutoStep): [string, string] => {
  const brand = brandOf(run);
  switch (step) {
    case 1: return [`Reading ${domainOf(run)}`, 'Reading the site for brand, product, audience and tone.'];
    case 2: return [`Finding proof on ${brand}'s site`, 'Pulling real numbers, promises and quotes to build on.'];
    case 3: return ['Picking hooks that already win', `Building ${brand}'s bank of proven hooks, slides and CTAs once, then picking ${plural(run.count, 'slideshow')}.`];
    case 4: return [`Writing ${plural(run.count, 'slideshow')}`, 'Hooks, slides and captions, all from the plan.'];
    case 5: return ['Making the photos', run.plan?.bankId ? 'A new photo for every slide.' : `${plural(run.plan?.photoPrompts.length ?? 0, 'photo')}, shared across the slideshows.`];
    case 6: return ['Building your slides', 'Putting text on photos, all in parallel.'];
  }
};

export const headerCopy = (run: AutoRunDto): RunTitleCopy => {
  // A finished run shows only its title above the calendar: no tag.
  if (run.status === 'COMPLETED') return { tag: '', title: `${plural(readyCount(run), 'slideshow')} ready for ${brandOf(run)}`, subtitle: '' };
  if (run.status === 'FAILED') return { tag: 'Stopped', title: `Step ${run.failedStep ?? '?'} failed`, subtitle: 'Earlier steps are saved. Retry below.' };
  const step = currentAutoStep(run.status) as AutoStep;
  const [title, subtitle] = activeCopy(run, step);
  return { tag: `Step ${step} of ${AUTO_STEPS.length}`, title, subtitle };
};

/** Finished-step lines, built from the run's saved checkpoints so they read the same after a reload. */
const doneCopy = (run: AutoRunDto, step: AutoStep): string => {
  const plan = run.plan;
  const photosOk = run.photos?.filter((p) => p.imageKey).length ?? 0;
  switch (step) {
    case 1: return `Mapped ${brandOf(run)}'s audience and value prop`;
    case 2: return `Found ${plural(run.levers?.length ?? 0, 'proof point')}`;
    case 3: return plan?.bankId
      ? `Picked ${plural(plan.picks.length, 'slideshow')} from the bank${plan.bankBuilt ? ' (built for this site)' : ''}`
      : `Planned ${plural(plan?.picks.length ?? 0, 'slideshow')} on ${plural(new Set(plan?.picks.map((p) => p.modelName)).size, 'model')}`;
    case 4: return `Wrote ${plural(run.slideshows.length, 'slideshow')}`;
    case 5: return `Made ${photosOk} of ${plural(run.photos?.length ?? 0, 'photo')}`;
    case 6: return `Rendered ${plural(readyCount(run), 'slideshow')}`;
  }
};

export const logLines = (run: AutoRunDto): LogLine[] => {
  const current = runStep(run);
  const failed = run.status === 'FAILED';
  return AUTO_STEPS.filter((step) => step <= current).map((step) => {
    if (step < current) return { key: `step-${step}`, text: `${doneCopy(run, step)}${seconds(run.stepTimings[step])}`, state: 'done' };
    const text = step === 6 ? `Rendering · ${readyCount(run)}/${run.slideshows.length} ready` : activeCopy(run, step)[0];
    return { key: `step-${step}`, text, state: failed ? 'failed' : 'active' };
  });
};
