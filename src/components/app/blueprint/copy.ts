/**
 * Every line of Brand Blueprint UI text, in one place so it can be reviewed and rewritten before launch.
 * Next5's own words: no course wording, no creator names, no copied example posts. No em dashes.
 */
import type { BlueprintFormat, Pillar } from '../../../lib/scriptGenerator/types';

export const STEP_LABELS = ['My brand', 'Topics', 'Formats', 'Checks', 'Plan + scripts', 'Blueprint'] as const;

export const INTRO = {
  kicker: 'Jun Yuh method',
  title: 'My Blueprint',
  accent: 'from blank page to 7 scripts',
  body: 'Start with nothing. Finish with a list of things to talk about and 7 scripts you can film this week.',
};

export const BRAND_STEP = {
  title: 'You are the trunk.',
  accent: 'Your topics are the branches.',
  body: 'Everything you can post about grows from three branches: what you know, what you love, and what you lived. Each topic you add shows up on the tree.',
  formulaTitle: 'Every post = topic + format',
  topic: { label: 'Topic', hint: 'What you talk about' },
  format: { label: 'Format', hint: 'How you show it' },
  tip: 'Go fast. A messy list today is worth more than a perfect list next month. You can change it all later.',
  next: 'Find my topics',
};

export type PillarCopy = { name: string; short: string; body: string; questions: [string, string]; examples: [string, string] };

export const PILLAR_COPY: Record<Pillar, PillarCopy> = {
  skills: {
    name: 'Skills',
    short: 'Skill',
    body: 'Things you can teach. You only need to be a few steps ahead of the person watching.',
    questions: ['What do people ask me about?', 'What am I learning right now?'],
    examples: ['How to price a home to sell fast', 'What to check before you buy a phone case'],
  },
  passions: {
    name: 'Passions',
    short: 'Passion',
    body: 'Things and people you care about. Viewers decide if they like you here, and people buy from people they like.',
    questions: ['What do I spend my own money or time on?', 'Who drives my purpose?'],
    examples: ['Weekend hikes with my kids', 'Fixing up old furniture'],
  },
  story: {
    name: 'Story',
    short: 'Story',
    body: 'Moments that shaped you. They can be small. They do not need to be sad or private.',
    questions: ['How did I get here?', 'What did I used to believe?'],
    examples: ['My first sale took 6 months', 'I used to think ads were the only way'],
  },
};

export const TOPICS_STEP = {
  title: 'Write your topics',
  accent: 'in 60 seconds',
  body: 'Write up to 5 topics in each branch, a few words each. Then keep your best 3 as main topics. The other 2 stay as extras.',
  timerHint: 'Press start and write as fast as you can. The timer does not stop you typing.',
  start: 'Start 60s',
  reset: 'Reset timer',
  done: 'Time is up. Keep going if you have more.',
  count: (main: number, filled: number) => `${main} of 3 main, ${filled} of 5 written`,
  slot: (n: number) => `Topic ${n}`,
  main: 'Main',
  extra: 'Extra',
  mainFull: 'You already have 3 main topics. Unmark one first.',
  clear: 'Clear',
  placeholderNote: 'The grey text is only an example. Write your own. Your topics are saved, so you can come back and change them any time.',
  next: 'Choose formats',
};

export type FormatCopy = { name: string; short: string; what: string; example: string; bestFor: string };

export const FORMAT_COPY: Record<BlueprintFormat, FormatCopy> = {
  talking: {
    name: 'Talking head',
    short: 'Talking',
    what: 'You talk to the camera. Captions on screen, a few cutaway shots.',
    example: 'A realtor on camera: "3 things buyers forget to ask at a showing."',
    bestFor: 'Skills. People trust you faster when they hear you.',
  },
  carousel: {
    name: 'Carousel',
    short: 'Carousel',
    what: 'A few photos or short clips with a line of text on each. Viewers swipe through.',
    example: 'A TikTok Shop seller: 5 slides, "5 ways to style one jacket."',
    bestFor: 'Skills and passions. Easy to make with photos you already have.',
  },
  broll: {
    name: 'B-roll with text',
    short: 'B-roll',
    what: 'Clips of your day with words on screen. You never speak.',
    example: 'Packing orders at night, one line on top: "Year one. 40 orders. Still here."',
    bestFor: 'Stories and moods. Good for days you do not want to be on camera.',
  },
};

export const FORMATS_STEP = {
  title: 'Pick how',
  accent: 'you show it',
  body: 'There are three formats. Any topic fits any format.',
  whatLabel: 'What it is',
  exampleLabel: 'Example',
  bestLabel: 'Best for',
  goodTitle: 'A post that works',
  good: ['Opens with a line that makes people curious', 'Teaches something or feels true to the viewer', 'Gives a new reason to keep watching every few seconds'],
  badTitle: 'A post that flops',
  bad: ['Takes too long to get to the point', 'Gives the viewer nothing to keep', 'Has no shape, so people drift away'],
  next: 'See the checks',
};

export const CHECKS = [
  { name: 'Strong hook', body: 'People keep watching past the first 3 seconds, so they get to your point.' },
  { name: 'Real value', body: 'People comment and share, and that shows your post to more people.' },
  { name: 'Re-hooks', body: 'People watch longer, and the app reads that as a good post.' },
] as const;

export const CHECKS_STEP = {
  title: 'Three checks',
  accent: 'before you film',
  body: 'Run every post through these. In the next step each day has a box to tick for each one.',
  test: 'Quick hook test: if this was the only line a stranger saw, would they stop scrolling? If not, change it before you film.',
  next: 'Plan my week',
};

export const SHELL = {
  pageTitle: 'Blueprint',
  back: 'Back',
  saving: 'Saving',
  saved: 'Saved',
  saveError: 'Not saved.',
  retry: 'Try again',
  loadError: 'We could not load your blueprint.',
  stepOf: (n: number, total: number) => `Step ${n} of ${total}`,
  readyCount: (n: number, total: number) => `${n} of ${total} days ready to record`,
  reset: 'Start a new week',
  resetConfirm: 'Tap again. Your 7 days and scripts go, your topics stay.',
  dismiss: 'OK',
};
