// Hook templates for the image overlay. The model only fills the [slots]; every other word is kept as written.
// Formats: Alex Hormozi, $100M Leads (the hook calls out the audience with a label, a yes-question, an open question,
// a conditional, a command, a statement, an exclamation, a list or a narrative). Templates: the proven hook library
// in src/data/hooks.json (ids kept for reference), shortened to fit a 32-character overlay (trailing colons and
// "Here's why:" tails dropped). Ordered best first within each format.

import type { HookFormat } from '../types/admin/metaAds';

export type HookTemplate = { id: string; format: HookFormat; template: string };

export const HOOK_FORMAT_LABELS: Record<HookFormat, string> = {
  label: 'Label',
  yes_question: 'Yes-question',
  open_question: 'Open question',
  conditional: 'Conditional',
  command: 'Command',
  statement: 'Statement',
  exclamation: 'Exclamation',
  list: 'List',
  narrative: 'Narrative',
};

export const HOOK_TEMPLATES: HookTemplate[] = [
  // Label: name the buyer first, so the right people stop.
  { id: 'hormozi_label', format: 'label', template: '[Audience]: [pain or wish]?' },
  { id: 'hook_366', format: 'label', template: 'The [profession] struggle is real' },
  // Yes-question: a question the buyer answers "yes" to.
  { id: 'hook_12', format: 'yes_question', template: 'Ever feel like [common pain point]?' },
  { id: 'hormozi_yes_want', format: 'yes_question', template: 'Want [dream outcome]?' },
  { id: 'hook_9', format: 'yes_question', template: 'Did you know [surprising fact]?' },
  // Open question: opens a loop the ad closes.
  { id: 'hook_24', format: 'open_question', template: "Why aren't you [action] yet?" },
  { id: 'hook_35', format: 'open_question', template: 'What if [common approach] is wrong?' },
  { id: 'hook_26', format: 'open_question', template: 'Is [X] really worth it?' },
  // Conditional: "if you…", self-selects the buyer.
  { id: 'hormozi_if', format: 'conditional', template: 'If you [situation], read this' },
  { id: 'hormozi_if_then', format: 'conditional', template: 'If you [situation], [do this]' },
  // Command: tells the buyer what to do or stop doing.
  { id: 'hook_36', format: 'command', template: 'Stop [doing X]' },
  { id: 'hook_53', format: 'command', template: "Here's your sign to [action]" },
  { id: 'hook_262', format: 'command', template: "Don't wait until [negative outcome]" },
  // Statement: one clear, specific claim.
  { id: 'hook_145', format: 'statement', template: 'The fastest way to [outcome]' },
  { id: 'hook_136', format: 'statement', template: 'How to [goal] without [obstacle]' },
  { id: 'hook_384', format: 'statement', template: '[Old way] vs [new way]' },
  { id: 'hook_163', format: 'statement', template: 'The hidden cost of [behavior]' },
  // Exclamation: an alert that interrupts the scroll.
  { id: 'hook_51', format: 'exclamation', template: 'PSA: [important information]' },
  { id: 'hook_166', format: 'exclamation', template: 'Warning: [important alert]' },
  { id: 'hook_48', format: 'exclamation', template: 'Hot take: [controversial opinion]' },
  // List: a number promises a quick, complete payoff.
  { id: 'hook_111', format: 'list', template: '[X] ways to [achieve goal]' },
  { id: 'hook_121', format: 'list', template: '[X] red flags in [context]' },
  // Narrative: a tiny story or scene the buyer sees themselves in.
  { id: 'hook_362', format: 'narrative', template: "POV: you're [relatable situation]" },
  { id: 'hook_276', format: 'narrative', template: 'From [start] to [end] in [time]' },
  { id: 'hook_363', format: 'narrative', template: 'Me trying to [relatable struggle]' },
];

/** How many hooks an ad gets, on top of its original one. */
export const HOOKS_PER_AD = 14;
