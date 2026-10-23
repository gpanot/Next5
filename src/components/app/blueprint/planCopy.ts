/** UI text for step 5 (plan + scripts), Record mode and step 6 (blueprint). Next5's own words. No em dashes. */

export const PLAN_STEP = {
  title: 'Your 7 days,',
  accent: 'with scripts',
  body: 'Each day gets a branch, a topic from your list and a format. Write the script, fill in your own details, film it from Record mode, then tick the three checks.',
  next: 'See my blueprint',
};

export const ABOUT_CARD = {
  title: 'Tell the writer about you',
  body: 'Fill this in once. All 7 scripts use it. The writer only uses facts you give it and leaves [brackets] where a personal detail is missing.',
  fields: {
    aud: { label: 'Who do you want to reach?', placeholder: 'First-time home buyers in Austin' },
    off: { label: 'What do you do or sell, in one line?', placeholder: 'I help families find their first home' },
    cred: { label: 'Proof (optional)', placeholder: '120 homes sold since 2019' },
    voice: { label: 'How you talk (optional)', placeholder: 'Calm, direct, a bit funny' },
  },
};

export const DAY_CARD = {
  day: (n: number) => `Day ${n}`,
  branch: 'Branch',
  topic: 'Topic',
  format: 'Format',
  pickTopic: 'Pick a topic',
  mainGroup: 'Main topics',
  extraGroup: 'Extra topics',
  noTopics: 'No topics in this branch yet. Add some in step 2.',
  removed: (topic: string) => `"${topic}" is no longer in your topics. Pick another one or add it back in step 2.`,
  hookIdea: 'Hook idea (optional)',
  hookIdeaPlaceholder: 'A first line you already like',
  notes: 'Details only you know (optional)',
  notesPlaceholder: 'Real numbers, names, a moment. The writer uses these and nothing else.',
  replaceWarn: 'This day has a script. Changing the topic or format removes it.',
  replaceYes: 'Change it',
  replaceNo: 'Keep my script',
  checksTitle: 'Before you film',
};

export const SCRIPT_UI = {
  write: 'Write my script',
  rewrite: 'Write a new version',
  hookOptions: 'Show me hook options',
  hideHooks: 'Hide hook options',
  pickHook: 'Use this hook',
  hooksLoading: 'Finding 3 hooks',
  writing: 'Writing your script. This takes up to a minute.',
  changing: 'Changing your script',
  stop: 'Stop',
  stopped: 'Stopped. If the writer was nearly done, the script may still appear when you come back.',
  tryAgain: 'Try again',
  needTopic: 'Pick a topic first.',
  firstFrame: 'First frame',
  onScreen: 'On screen',
  say: 'Say',
  show: 'Show',
  rehook: 'Re-hook',
  close: 'Close',
  caption: 'Caption',
  tips: 'Filming tips',
  placeholders: 'Fill these in with your real details before recording. Type them in Change it (for example: my first sale was in 2019), or add them to Details and write a new version.',
  record: 'Record mode',
  copy: 'Copy script',
  copied: 'Copied',
  copyFallback: 'Copy did not work here. Select the text below and copy it.',
  changeLabel: 'Change it',
  changePlaceholder: 'Make the hook punchier',
  changeSend: 'Change',
};

export const ERROR_COPY: Record<string, string> = {
  rate_limited: 'You wrote a lot of scripts in the last hour. Wait a bit, then try again.',
  SCRIPT_INVALID: 'The script came back in a shape we could not use. Try again.',
  invalid_hooks: 'The hook options came back in a shape we could not use. Try again.',
  model_refused: 'The writer would not write this one. Change the topic or details and try again.',
  topic_required: 'Pick a topic for this day first.',
  network_error: 'We could not reach Next5. Check your connection and try again.',
};

export const RECORD = {
  smaller: 'Smaller text',
  larger: 'Larger text',
  speed: 'Speed',
  start: 'Start',
  pause: 'Pause',
  close: 'Close',
  restart: 'Back to top',
};

export const SUMMARY_STEP = {
  title: 'Your blueprint,',
  accent: 'on one page',
  body: 'Here is everything on one page. Copy it into your notes app or send it to yourself. Come back and change it any time.',
  copy: 'Copy blueprint',
  copied: 'Copied',
  copyFallback: 'Copy did not work here. Select the text below and copy it.',
};
