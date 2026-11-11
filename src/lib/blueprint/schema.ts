/**
 * Brand Blueprint: stored shapes, the default 7-day plan and the day status. Client-safe.
 * Every write is validated with these schemas on the server. Plan: docs/brand-blueprint-spec.md
 */
import { z } from 'zod';
import { BLUEPRINT_FORMATS, PILLARS, scriptPlaceholders, scriptSchema, type BlueprintFormat, type Pillar } from '../scriptGenerator/types';

/** Up to 5 topics per pillar, narrowed to 3 main (the other 2 stay optional). */
export const TOPIC_SLOTS = 5;
export const MAIN_TOPICS = 3;
export const ABOUT_MAX = 200;
export const NOTES_MAX = 400;
export const HOOK_IDEA_MAX = 200;
export const TOPIC_MAX = 120;
export const INSTRUCTION_MAX = 300;
export const DAYS = 7;
/** My Brand, Topics, Formats, Criteria, Plan + scripts, Blueprint. */
export const STEPS = 6;

export const topicItemSchema = z.object({ text: z.string().max(TOPIC_MAX), main: z.boolean() });

/** Always 5 slots, so each field keeps its place; at most 3 marked main. */
const pillarTopicsSchema = z
  .array(topicItemSchema)
  .length(TOPIC_SLOTS)
  .refine((items) => items.filter((t) => t.main).length <= MAIN_TOPICS, { message: `At most ${MAIN_TOPICS} main topics per branch.` });

export const topicsSchema = z.object({ skills: pillarTopicsSchema, passions: pillarTopicsSchema, story: pillarTopicsSchema });

/** aud = audience, off = what they do or offer, cred = proof, voice = speaking style. */
export const aboutSchema = z.object({
  aud: z.string().max(ABOUT_MAX),
  off: z.string().max(ABOUT_MAX),
  cred: z.string().max(ABOUT_MAX),
  voice: z.string().max(ABOUT_MAX),
});

export const planDaySchema = z.object({
  pillar: z.enum(PILLARS as [Pillar, ...Pillar[]]),
  format: z.enum(BLUEPRINT_FORMATS as [BlueprintFormat, ...BlueprintFormat[]]),
  topic: z.string().max(TOPIC_MAX),
  hookIdea: z.string().max(HOOK_IDEA_MAX),
  notes: z.string().max(NOTES_MAX),
  checks: z.tuple([z.boolean(), z.boolean(), z.boolean()]),
  script: scriptSchema.nullable(),
});

export const planSchema = z.array(planDaySchema).length(DAYS);

export type TopicItem = z.infer<typeof topicItemSchema>;
export type Topics = z.infer<typeof topicsSchema>;
export type About = z.infer<typeof aboutSchema>;
export type PlanDay = z.infer<typeof planDaySchema>;

/** A day edit from the page. The script is never sent by the client: only the generate and refine routes write it. */
export const dayPatchSchema = planDaySchema.omit({ script: true }).partial();
export type DayPatch = z.infer<typeof dayPatchSchema>;

export const blueprintPatchSchema = z.object({
  version: z.number().int().positive(),
  topics: topicsSchema.optional(),
  about: aboutSchema.optional(),
  days: z.record(z.string().regex(/^[0-6]$/), dayPatchSchema).optional(),
  step: z.number().int().min(0).max(STEPS - 1).optional(),
  /** Start a fresh week: the plan and its scripts go, topics and the About card stay (the page asks for a second tap first). */
  reset: z.literal(true).optional(),
});
export type BlueprintPatch = z.infer<typeof blueprintPatchSchema>;

export type BlueprintDto = {
  id: string;
  topics: Topics;
  about: About;
  plan: PlanDay[];
  step: number;
  version: number;
  updatedAt: string;
};

const DEFAULT_PATTERN: Array<[Pillar, BlueprintFormat]> = [
  ['skills', 'talking'],
  ['story', 'broll'],
  ['skills', 'carousel'],
  ['skills', 'talking'],
  ['passions', 'carousel'],
  ['skills', 'broll'],
  ['story', 'broll'],
];

export const defaultPlan = (): PlanDay[] =>
  DEFAULT_PATTERN.map(([pillar, format]) => ({
    pillar,
    format,
    topic: '',
    hookIdea: '',
    notes: '',
    checks: [false, false, false],
    script: null,
  }));

const emptySlots = (): TopicItem[] => Array.from({ length: TOPIC_SLOTS }, () => ({ text: '', main: false }));
export const emptyTopics = (): Topics => ({ skills: emptySlots(), passions: emptySlots(), story: emptySlots() });
export const EMPTY_ABOUT: About = { aud: '', off: '', cred: '', voice: '' };

/** The filled topics of one pillar, main first. */
export const pillarTopics = (items: TopicItem[]): { main: string[]; optional: string[] } => {
  const filled = items.map((t) => ({ ...t, text: t.text.trim() })).filter((t) => t.text);
  return { main: filled.filter((t) => t.main).map((t) => t.text), optional: filled.filter((t) => !t.main).map((t) => t.text) };
};

/** Typing into an empty slot makes it main while fewer than 3 are; clearing a slot unmarks it. */
export const editTopic = (items: TopicItem[], index: number, text: string): TopicItem[] => {
  const mainCount = items.filter((t, i) => t.main && i !== index).length;
  return items.map((t, i) => {
    if (i !== index) return t;
    if (!text.trim()) return { text, main: false };
    return { text, main: t.text.trim() ? t.main : mainCount < MAIN_TOPICS };
  });
};

/** Flips main on one filled slot. A 4th main is refused (returns the list unchanged). */
export const toggleMain = (items: TopicItem[], index: number): TopicItem[] => {
  const target = items[index];
  if (!target?.text.trim()) return items;
  if (!target.main && items.filter((t) => t.main).length >= MAIN_TOPICS) return items;
  return items.map((t, i) => (i === index ? { ...t, main: !t.main } : t));
};

/** Applies a day edit. A new format or topic makes the old script wrong for the day, so it goes (the page warns first). */
export const applyDayPatch = (day: PlanDay, patch: DayPatch): PlanDay => {
  const merged = { ...day, ...patch };
  const stale = (patch.format !== undefined && patch.format !== day.format) || (patch.topic !== undefined && patch.topic !== day.topic);
  return stale ? { ...merged, script: null, checks: [false, false, false] } : merged;
};

export type DayStatus = 'pick_topic' | 'write_script' | 'fill_placeholders' | 'run_checks' | 'ready';

export const DAY_STATUS_LABEL: Record<DayStatus, string> = {
  pick_topic: 'Pick a topic',
  write_script: 'Write the script',
  fill_placeholders: 'Fill in your details',
  run_checks: 'Run the checks',
  ready: 'Ready to record',
};

/** Ready needs a topic, a script with no [placeholder] left in what is seen or said, and all three checks. */
export const dayStatus = (day: PlanDay): DayStatus => {
  if (!day.topic.trim()) return 'pick_topic';
  if (!day.script) return 'write_script';
  if (scriptPlaceholders(day.script).length > 0) return 'fill_placeholders';
  if (!day.checks.every(Boolean)) return 'run_checks';
  return 'ready';
};
