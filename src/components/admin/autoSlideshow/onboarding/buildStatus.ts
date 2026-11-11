import { currentAutoStep, type AutoRunDto } from '../../../../types/admin/autoSlideshow';

/**
 * The first run's 6 pipeline steps shown as 4 stages. Nothing here is guessed: every state comes from the run the page
 * already polls. Steps 1-2 (scan, proof) are `website`, step 3 (hooks from the Slideshow Bank) is `niche`, step 4
 * (write) is `plan`, steps 5-6 (photos, render) are `first_post`. Rendering started counts as done: the slideshow
 * can finish while the user is on the calendar.
 */
export type StageKey = 'website' | 'niche' | 'plan' | 'first_post';
export type StageState = 'waiting' | 'running' | 'done' | 'failed';
export type BuildStage = { key: StageKey; title: string; state: StageState; detail: string | null };
export type BuildStatus = { status: 'running' | 'done' | 'failed'; pct: number; stages: BuildStage[]; failedStage: StageKey | null };

const STAGES: { key: StageKey; title: string; running: string; steps: number[] }[] = [
  { key: 'website', title: 'Reading your website', running: 'Looking through your site', steps: [1, 2] },
  { key: 'niche', title: 'Finding what works in your niche', running: 'Scanning top posts', steps: [3] },
  { key: 'plan', title: 'Writing your posts', running: 'Writing captions', steps: [4] },
  { key: 'first_post', title: 'Making your first slideshow', running: 'Rendering', steps: [5, 6] },
];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Counts we really have; a missing or zero count is left out, never shown as 0. */
const websiteDetail = (run: AutoRunDto): string => {
  const parts = [run.profile?.productCategories.length ?? 0, run.levers?.length ?? 0];
  const words = [parts[0] ? plural(parts[0], 'product type', 'product types') : null, parts[1] ? plural(parts[1], 'proof point', 'proof points') : null].filter(Boolean);
  return words.length ? `${words.join(' and ')} found` : 'Your brand, tone and audience';
};

const doneDetail = (key: StageKey, run: AutoRunDto): string => {
  if (key === 'website') return websiteDetail(run);
  if (key === 'niche') return 'Hooks that already got views';
  if (key === 'plan') return 'Hooks, captions and hashtags';
  return 'On us';
};

/** Step the run is on: 7 once completed; on failure, the failed step. */
const stepOf = (run: AutoRunDto): number => (run.status === 'FAILED' ? (run.failedStep ?? 1) : currentAutoStep(run.status));

const stateOf = (steps: number[], step: number, failed: boolean): StageState => {
  const first = steps[0]!;
  const last = steps[steps.length - 1]!;
  // Rendering started (step 6) is the last stage's done point, unless the render itself failed.
  const doneAt = last === 6 && !failed ? 6 : last + 1;
  if (step >= doneAt) return 'done';
  if (step < first) return 'waiting';
  return failed ? 'failed' : 'running';
};

/** 25 per stage; a running stage counts half, a little more once its second step started. */
const stagePct = (steps: number[], step: number, state: StageState): number => {
  if (state === 'done') return 25;
  if (state !== 'running') return 0;
  return steps.length === 2 && step === steps[1] ? 18 : 12;
};

export const buildStatusOf = (run: AutoRunDto): BuildStatus => {
  const failed = run.status === 'FAILED';
  const step = stepOf(run);
  const states = STAGES.map(({ steps }) => stateOf(steps, step, failed));
  const stages = STAGES.map(({ key, title, running }, i): BuildStage => {
    const state = states[i]!;
    const waitingFor = state !== 'running' ? null : run.status === 'WAITING_TARGET' ? 'Waiting for your client pick' : run.status === 'WAITING_AVATAR' ? 'Waiting for your avatar pick' : null;
    const detail = state === 'done' ? doneDetail(key, run) : waitingFor ?? (state === 'running' ? running : state === 'failed' ? 'This step did not finish' : null);
    return { key, title, state, detail };
  });
  const allDone = states.every((s) => s === 'done');
  const status = allDone ? 'done' : failed ? 'failed' : 'running';
  const sum = STAGES.reduce((total, { steps }, i) => total + stagePct(steps, step, states[i]!), 0);
  return { status, pct: allDone ? 100 : Math.min(99, sum), stages, failedStage: stages.find((s) => s.state === 'failed')?.key ?? null };
};
