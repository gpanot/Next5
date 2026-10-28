/** Script Generator carousels (Jun Yuh, Day 2 Module 5): the 3 storytelling types and their ready templates.
 *  Client-safe. `rules` and the section `job`s go into the prompt, so edit them to change how carousels are written. */

export type CarouselType = 'my_story' | 'numbered_list' | 'split_screen';

export type CarouselTemplate =
  | 'story_3p'
  | 'story_6'
  | 'list_signs'
  | 'list_habits'
  | 'list_stopped'
  | 'list_mistakes'
  | 'split_to_be_her'
  | 'split_before_after'
  | 'split_expectation_reality'
  | 'split_they_see'
  | 'split_then_now';

/** slides: one photo per slide. split: each slide has a top and a bottom photo. */
export type CarouselLayout = 'slides' | 'split';

/** A run of slides that share one job, e.g. 7 PROBLEM slides. `count: 'list'` is the list length the admin picks. */
export type CarouselSection = { name: string; count: number | 'list'; job: string };

/** The answers a template asks for. Their wording lives in CAROUSEL_QUESTIONS. */
export type CarouselQuestionKey = 'field' | 'audience' | 'topic' | 'start' | 'pursuit' | 'now' | 'moments' | 'result' | 'work';

export type CarouselTemplateInfo = {
  type: CarouselType;
  label: string;
  /** A filled example, shown on the card. */
  example: string;
  desc: string;
  layout: CarouselLayout;
  sections: CarouselSection[];
  questions: CarouselQuestionKey[];
  /** Slide 1 is fixed by the template ("dear younger me"), so there is no hook step. */
  fixedHook?: boolean;
  /** Template-specific instructions added to the prompt. */
  rules: string;
};

export const CAROUSEL_TYPES: Record<CarouselType, { label: string; desc: string }> = {
  my_story: { label: 'My Story', desc: 'How you got your skill, told in photos with one line each. Builds trust for later coaching.' },
  numbered_list: { label: 'Numbered List', desc: '"14 signs you..." Items the viewer recognises, and a list they want to finish.' },
  split_screen: { label: 'Split Screen', desc: 'Two photos on each slide. The viewer sees where they are and where they could be.' },
};

export type CarouselQuestion = { title: string; help: string; required: boolean; examples: string[] };

export const CAROUSEL_QUESTIONS: Record<CarouselQuestionKey, CarouselQuestion> = {
  field: { title: 'What do you do?', help: 'Your job or business, in a few words.', required: true, examples: ['I own a hair salon in Austin', 'Realtor in Phoenix, mostly first-time buyers', 'I sell handmade candles on TikTok Shop'] },
  audience: { title: 'Who is it for?', help: 'One specific person and the problem they have right now. Slide 1 talks about them, not you.', required: true, examples: ['First-time buyers in their 30s scared they cannot afford a home', 'New salon owners with empty chairs on weekdays'] },
  topic: { title: 'What is the list about?', help: 'The topic in a few words. The AI writes the items.', required: true, examples: ['Signs you are ready to buy your first home', 'Habits of stylists who are booked out for months'] },
  start: { title: 'Where did you start?', help: 'The hard part: real moments, years, places. We never invent your story, so only write what is true.', required: true, examples: ['2019: broke, renting a chair, 3 clients a week, crying in my car after work'] },
  pursuit: { title: 'What did you do about it?', help: 'The work: small daily actions, the grind, the turning point.', required: true, examples: ['Posted every day for a year, took every walk-in, saved for my own place'] },
  now: { title: 'Where are you now?', help: 'Real results and the moment it felt worth it.', required: true, examples: ['Opened my own salon in 2024, 4 stylists, booked 6 weeks out'] },
  moments: { title: 'Any real moments to use?', help: 'Optional. A few true details: when you started, a hard time, a big win. The 6 photos follow your path.', required: false, examples: ['Cut my first hair at 15, beauty school at 19, renting a chair at 22, opened my salon at 29'] },
  result: { title: 'What does the result look like?', help: 'What people see: the version of you, or the "after".', required: true, examples: ['A realtor who closes 3 homes a month', 'My own salon, fully booked'] },
  work: { title: 'What did it really take?', help: 'The "before", or the work behind the result. Real details only.', required: true, examples: ['6 am calls, 40 a day, open houses every weekend for 2 years'] },
};

/** Lengths offered for a numbered list (items, not counting the cover and the closing slide). */
export const LIST_COUNTS = [5, 7, 10, 14] as const;
export const DEFAULT_LIST_COUNT = 10;

const listSections = (cover: string, item: string): CarouselSection[] => [
  { name: 'COVER', count: 1, job: cover },
  { name: 'ITEM', count: 'list', job: `${item} Number them. Keep the strongest item for last, so the viewer swipes to the end.` },
  { name: 'CLOSE', count: 1, job: 'One line that makes the viewer save or share the post.' },
];

const LIST_QUESTIONS: CarouselQuestionKey[] = ['field', 'audience', 'topic'];
const SPLIT_QUESTIONS: CarouselQuestionKey[] = ['field', 'audience', 'result', 'work'];

export const CAROUSEL_TEMPLATES: Record<CarouselTemplate, CarouselTemplateInfo> = {
  story_3p: {
    type: 'my_story',
    label: 'Origin story: Problem, Pursuit, Payoff',
    example: 'Exactly six months ago I won my first show... the next six months were the hardest',
    desc: '19 slides: 7 problem, 7 pursuit, 5 payoff. One short line on each photo, like a diary.',
    layout: 'slides',
    sections: [
      { name: 'PROBLEM', count: 7, job: 'Where you started and what hurt. Concrete moments, years and places. Slide 1 is the hook.' },
      { name: 'PURSUIT', count: 7, job: 'What you did about it, step by step. Small daily actions, the grind, the turning point.' },
      { name: 'PAYOFF', count: 5, job: 'What changed. Real results and the moment it felt worth it. The last slide lands the emotion.' },
    ],
    questions: ['field', 'audience', 'start', 'pursuit', 'now'],
    rules: "Each slide is one line of 4 to 14 words, like a diary entry. A year or an age at the start of a line ('2013:') works well. The story shows how the creator got their skill, so the viewer trusts them later.",
  },
  story_6: {
    type: 'my_story',
    label: 'Dear younger me (6 slides)',
    example: 'dear younger me / you have no idea / how much your life / is going to change / i think you would be / pretty proud',
    desc: 'Your path in 6 photos, from younger you to success. One sentence across the 6 slides. The easiest post to make.',
    layout: 'slides',
    sections: [
      { name: 'YOUNGER YOU', count: 1, job: "A childhood photo of the creator. Text: 'dear younger me'." },
      { name: 'LEARNING', count: 1, job: "Learning or growing in the field (a beginner, a student, training). Text: 'you have no idea'." },
      { name: 'PRACTISING', count: 1, job: "Practising the skill, looking capable. Text: 'how much your life'." },
      { name: 'STRUGGLING', count: 1, job: "Struggling or focused: tired, studying, the job they hated, building the business. Text: 'is going to change'." },
      { name: 'PASSION', count: 1, job: "The people or thing the creator loves: friends, family, the team. Text: 'i think you would be'." },
      { name: 'SUCCESS', count: 1, job: "Joy or success: teaching, the work on display, opening day, with family. Text: 'pretty proud'." },
    ],
    questions: ['field', 'moments'],
    fixedHook: true,
    rules: "The 6 texts are fixed, lower case, exactly as given in the slide plan. Your job is the 6 photos: say what each one shows for this creator's field, as a photo they already have or can take. Use the creator's real moments where given.",
  },
  list_signs: {
    type: 'numbered_list',
    label: 'Signs you...',
    example: '14 signs you are ready to buy your first home',
    desc: 'Signs the viewer checks against their own life. The most relatable list, and it drives comments.',
    layout: 'slides',
    sections: listSections("The title, like '[N] signs you [are ready for / need / have] [thing]', about the viewer.", 'One sign per slide that the viewer recognises in their own life in one second.'),
    questions: LIST_QUESTIONS,
    rules: 'Signs are small, specific and a little funny or painfully true, never vague.',
  },
  list_habits: {
    type: 'numbered_list',
    label: 'Habits of...',
    example: '10 habits of realtors who close every month',
    desc: 'The habits of the person your viewer wants to become.',
    layout: 'slides',
    sections: listSections("The title, like '[N] habits of [who the viewer wants to be]'. Make the 'who' specific and wanted.", 'One habit per slide: a short bold line, then one sentence that makes it concrete.'),
    questions: LIST_QUESTIONS,
    rules: 'Habits are specific actions with a time, a number or a place, never vague advice like "stay consistent".',
  },
  list_stopped: {
    type: 'numbered_list',
    label: 'Things I stopped doing',
    example: '7 things I stopped doing to grow my salon',
    desc: 'What you cut out to get your result. Personal and easy to relate to.',
    layout: 'slides',
    sections: listSections("The title, like '[N] things I stopped doing to [result the viewer wants]'.", 'One thing per slide that most people still do, then what changed when the creator stopped.'),
    questions: LIST_QUESTIONS,
    rules: 'Every item must be something the viewer is probably doing right now.',
  },
  list_mistakes: {
    type: 'numbered_list',
    label: 'Mistakes...',
    example: '10 mistakes new TikTok Shop sellers make',
    desc: 'Mistakes to avoid. Positions you as the expert.',
    layout: 'slides',
    sections: listSections("The title, like '[N] mistakes [who] make with [thing]'.", 'One mistake per slide in a bold line, then the fix in one sentence.'),
    questions: LIST_QUESTIONS,
    rules: 'Mistakes are specific and common. The fix is one action the viewer can take today.',
  },
  split_to_be_her: {
    type: 'split_screen',
    label: 'To be her... / I had to be her',
    example: 'To be her... (confident, award-winning) / I had to be her (the work)',
    desc: 'Top: the version people admire. Bottom: what it took to earn it.',
    layout: 'split',
    sections: [
      { name: 'COVER', count: 1, job: "Top text 'To be her...' (or him) on the admired result. Bottom text 'I had to be her' (or him) on the hard work behind it." },
      { name: 'PAIR', count: 5, job: 'Top: one admired version (confident, successful, award-winning). Bottom: the earned work behind it.' },
    ],
    questions: SPLIT_QUESTIONS,
    rules: 'The bottom half always shows effort: early mornings, practice, the boring work. Each version is earned.',
  },
  split_before_after: {
    type: 'split_screen',
    label: 'Before / After',
    example: 'Before: 3 listings a year / After: 3 listings a month',
    desc: 'The classic transformation. The same thing, before and after.',
    layout: 'split',
    sections: [
      { name: 'COVER', count: 1, job: "Top: 'Before'. Bottom: 'After'. The biggest visible change." },
      { name: 'PAIR', count: 5, job: 'Top: one detail before. Bottom: the same detail after, same angle and framing.' },
    ],
    questions: SPLIT_QUESTIONS,
    rules: 'Only use changes the creator gave you. Where a real number is missing, write a [placeholder].',
  },
  split_expectation_reality: {
    type: 'split_screen',
    label: 'Expectation / Reality',
    example: 'Expectation: open house full of buyers / Reality: me and a plate of cookies',
    desc: 'What people think the job looks like, and what it really is. Funny and honest.',
    layout: 'split',
    sections: [
      { name: 'COVER', count: 1, job: "Top: 'Expectation'. Bottom: 'Reality'. The topic in one glance." },
      { name: 'PAIR', count: 5, job: 'Top: the shiny version people imagine. Bottom: the real, slightly funny truth.' },
    ],
    questions: SPLIT_QUESTIONS,
    rules: 'Warm and self-aware, never bitter. The last pair turns the reality into something the creator is proud of.',
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
    questions: SPLIT_QUESTIONS,
    rules: 'The bottom half is always a specific action the creator can photograph.',
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
    questions: SPLIT_QUESTIONS,
    rules: "Top photos are real old photos from the creator's camera roll. Only use moments the creator gave; otherwise write a [placeholder].",
  },
};

export const isCarouselTemplate = (v: unknown): v is CarouselTemplate => typeof v === 'string' && v in CAROUSEL_TEMPLATES;

/** Slides of each section, with a numbered list's length filled in (count, and [N] in the jobs). */
export const sectionsOf = (t: CarouselTemplate, listCount = DEFAULT_LIST_COUNT): Array<CarouselSection & { count: number }> =>
  CAROUSEL_TEMPLATES[t].sections.map((s) => ({ ...s, count: s.count === 'list' ? listCount : s.count, job: s.job.replaceAll('[N]', String(listCount)) }));

export const carouselSlideCount = (t: CarouselTemplate, listCount = DEFAULT_LIST_COUNT): number =>
  sectionsOf(t, listCount).reduce((n, s) => n + s.count, 0);

/** The templates of one type, in the order they are listed above. */
export const templatesOf = (type: CarouselType): CarouselTemplate[] =>
  (Object.keys(CAROUSEL_TEMPLATES) as CarouselTemplate[]).filter((k) => CAROUSEL_TEMPLATES[k].type === type);
