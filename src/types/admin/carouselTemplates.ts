/** Script Generator carousels: the 3 types (My Story, Numbered List, Split Screen) and their ready templates.
 *  Client-safe. The prompt text in `rules` is what the model follows, so edit it to change how carousels are written. */

export type CarouselType = 'my_story' | 'numbered_list' | 'split_screen';

export type CarouselTemplate =
  | 'story_3p'
  | 'story_6'
  | 'list_habits'
  | 'list_stopped'
  | 'list_signs'
  | 'list_mistakes'
  | 'split_to_be_her'
  | 'split_before_after'
  | 'split_expectation_reality'
  | 'split_they_see'
  | 'split_then_now';

/** slides: one photo per slide. split: each slide has a top and a bottom photo. */
export type CarouselLayout = 'slides' | 'split';

/** A run of slides that share one job, e.g. 7 PROBLEM slides. Slide labels start with the section name. */
export type CarouselSection = { name: string; count: number; job: string };

export type CarouselTemplateInfo = {
  type: CarouselType;
  label: string;
  /** A filled example, shown on the card. */
  example: string;
  desc: string;
  layout: CarouselLayout;
  sections: CarouselSection[];
  /** Template-specific instructions added to the prompt. */
  rules: string;
};

export const CAROUSEL_TYPES: Record<CarouselType, { label: string; desc: string }> = {
  my_story: { label: 'My Story', desc: 'Your real story told in photos and one line of text per slide. Builds connection fast.' },
  numbered_list: { label: 'Numbered List', desc: '"10 habits of..." One cover, one point per slide. Easy to save and share.' },
  split_screen: { label: 'Split Screen', desc: 'Two photos stacked on each slide: before and after, them and me, then and now.' },
};

const listSections = (cover: string): CarouselSection[] => [
  { name: 'COVER', count: 1, job: cover },
  { name: 'POINT', count: 10, job: 'One point per slide: a short bold line, then one sentence that makes it concrete. Number it (1 to 10). The strongest point goes last.' },
  { name: 'CLOSE', count: 1, job: 'A one-line wrap-up that makes the viewer want to save the post.' },
];

export const CAROUSEL_TEMPLATES: Record<CarouselTemplate, CarouselTemplateInfo> = {
  story_3p: {
    type: 'my_story',
    label: 'Problem, Pursuit, Payoff (19 slides)',
    example: '2013: my parents divorced... and I eventually...',
    desc: 'The long story arc: 7 problem slides, 7 pursuit slides, 5 payoff slides. One short line on each photo.',
    layout: 'slides',
    sections: [
      { name: 'PROBLEM', count: 7, job: 'Where you started and what hurt. Concrete moments, years and places. The first slide is the hook.' },
      { name: 'PURSUIT', count: 7, job: 'What you did about it, step by step. Small daily actions, the grind, the turning point.' },
      { name: 'PAYOFF', count: 5, job: 'What changed. Real results and the moment it all felt worth it. The last slide lands the emotion.' },
    ],
    rules: "Each slide is one line of 4 to 14 words, like a diary entry. A year or age at the start of a line ('2013:') works well. Slide 2 must also work as a hook, because the app shows slide 2 to people who skipped slide 1.",
  },
  story_6: {
    type: 'my_story',
    label: 'Dear younger me (6 slides)',
    example: 'dear younger me / you have no idea / how much your life / is going to change / i think you would be / pretty proud',
    desc: 'Your progress in 6 steps, from younger you to today. One sentence split across the 6 slides.',
    layout: 'slides',
    sections: [{ name: 'STEP', count: 6, job: 'One step of the journey per slide, from oldest (a childhood photo) to newest (the proud moment today).' }],
    rules: "'onScreen' on the 6 slides together forms ONE sentence of about 18 words, 2 to 5 words per slide, lower case. The classic is: dear younger me / you have no idea / how much your life / is going to change / i think you would be / pretty proud. Keep that sentence unless the creator's idea needs another one. 'broll' says which real photo goes on the slide, following the creator's path (younger photo, learning the skill, doing the work, the hard day job, family, the win).",
  },
  list_habits: {
    type: 'numbered_list',
    label: '10 habits of...',
    example: '10 habits of realtors who close every month',
    desc: 'The habits of the person your viewer wants to become.',
    layout: 'slides',
    sections: listSections("The title, like '10 habits of [who the viewer wants to be]'. Make the 'who' specific and wanted."),
    rules: 'Habits must be specific actions with a time, a number or a place, never vague advice like "stay consistent".',
  },
  list_stopped: {
    type: 'numbered_list',
    label: '10 things I stopped doing',
    example: '10 things I stopped doing to grow my salon',
    desc: 'What you cut out to get your result. Personal and easy to relate to.',
    layout: 'slides',
    sections: listSections("The title, like '10 things I stopped doing to [result]'."),
    rules: 'Each point names a thing most people still do, then what happened when the creator stopped.',
  },
  list_signs: {
    type: 'numbered_list',
    label: '10 signs you...',
    example: '10 signs you are ready to buy your first home',
    desc: 'Signs the viewer can check against their own life. Drives comments.',
    layout: 'slides',
    sections: listSections("The title, like '10 signs you [are ready for / need] [thing]'."),
    rules: 'Each sign is something the viewer can check in their own life in one second.',
  },
  list_mistakes: {
    type: 'numbered_list',
    label: '10 mistakes...',
    example: '10 mistakes new TikTok Shop sellers make',
    desc: 'Mistakes to avoid. Positions you as the expert.',
    layout: 'slides',
    sections: listSections("The title, like '10 mistakes [who] make with [thing]'."),
    rules: 'Each point names the mistake in a bold line, then the fix in one sentence.',
  },
  split_to_be_her: {
    type: 'split_screen',
    label: 'To be her... / I had to be her',
    example: 'To be her... (the dream) / I had to be her (the work)',
    desc: 'Top: the result people want. Bottom: the unglamorous work behind it.',
    layout: 'split',
    sections: [
      { name: 'COVER', count: 1, job: "Top: the dream result, text 'To be her...' or 'To be him...'. Bottom: the hard work behind it, text 'I had to be her' or 'I had to be him'." },
      { name: 'PAIR', count: 5, job: 'Top: one part of the result people see. Bottom: the matching daily work nobody sees.' },
    ],
    rules: 'Pick her or him to match the creator. The bottom half always shows effort: early mornings, practice, the boring work.',
  },
  split_before_after: {
    type: 'split_screen',
    label: 'Before / After',
    example: 'Before: 3 listings a year / After: 3 listings a month',
    desc: 'The classic transformation. The same thing, before and after.',
    layout: 'split',
    sections: [
      { name: 'COVER', count: 1, job: "Top: 'Before'. Bottom: 'After'. The biggest visible change." },
      { name: 'PAIR', count: 5, job: 'Top: one detail before. Bottom: the same detail after. Same angle and framing on both.' },
    ],
    rules: 'Only use changes the creator gave you. Where a real number is missing, write a [placeholder].',
  },
  split_expectation_reality: {
    type: 'split_screen',
    label: 'Expectation / Reality',
    example: 'Expectation: open house full of buyers / Reality: me and a plate of cookies',
    desc: 'What people think the job or the journey looks like, and what it really is. Funny and honest.',
    layout: 'split',
    sections: [
      { name: 'COVER', count: 1, job: "Top: 'Expectation'. Bottom: 'Reality'. The topic in one glance." },
      { name: 'PAIR', count: 5, job: 'Top: the shiny version people imagine. Bottom: the real, slightly funny truth.' },
    ],
    rules: 'Keep it warm and self-aware, never bitter. The last pair turns the reality into something the creator is proud of.',
  },
  split_they_see: {
    type: 'split_screen',
    label: 'What they see / What I do',
    example: 'What they see: the sold sign / What I do: 40 calls a day',
    desc: 'The result in public versus the work in private.',
    layout: 'split',
    sections: [
      { name: 'COVER', count: 1, job: "Top: 'What they see'. Bottom: 'What I actually do'." },
      { name: 'PAIR', count: 5, job: 'Top: one public result. Bottom: the private habit or work behind it.' },
    ],
    rules: 'The bottom half is always a specific, filmable action.',
  },
  split_then_now: {
    type: 'split_screen',
    label: 'Then / Now',
    example: 'Then: selling from my kitchen / Now: my own studio',
    desc: 'Where you started versus where you are. Pairs well with old photos.',
    layout: 'split',
    sections: [
      { name: 'COVER', count: 1, job: "Top: 'Then' with the year. Bottom: 'Now'." },
      { name: 'PAIR', count: 5, job: 'Top: one thing from back then. Bottom: the same thing today.' },
    ],
    rules: "Top photos are real old photos from the creator's camera roll. Only use moments the creator gave you; otherwise write a [placeholder].",
  },
};

export const isCarouselTemplate = (v: unknown): v is CarouselTemplate => typeof v === 'string' && v in CAROUSEL_TEMPLATES;

export const carouselSlideCount = (t: CarouselTemplate): number => CAROUSEL_TEMPLATES[t].sections.reduce((n, s) => n + s.count, 0);

/** The templates of one type, in the order they are listed above. */
export const templatesOf = (type: CarouselType): CarouselTemplate[] =>
  (Object.keys(CAROUSEL_TEMPLATES) as CarouselTemplate[]).filter((k) => CAROUSEL_TEMPLATES[k].type === type);
