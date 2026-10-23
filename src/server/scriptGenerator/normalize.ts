// server-only. Turns a model answer into a valid Script, or says why it cannot.
import { BEAT_RANGE, scriptSchema, type BlueprintFormat, type Script } from '../../lib/scriptGenerator/types';
import { HttpError } from '../http';
import { BLUEPRINT_FORMAT_RULES } from './rules';

/** Em dashes become a comma; a spaced en dash too. Ranges like 5–7 keep their en dash. */
export const stripDashes = (value: string): string =>
  value
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s+–\s+/g, ', ')
    .replace(/^,\s*/, '')
    .replace(/,\s*([.!?])/g, '$1')
    .trim();

const str = (value: unknown): string => (typeof value === 'string' ? stripDashes(value) : '');

type Raw = Record<string, unknown>;
const obj = (value: unknown): Raw => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : {});

export const invalidScript = (why: string) => new HttpError(502, 'SCRIPT_INVALID', 'The script came back in a shape we cannot use. Try again.', { why });

/** Coerces the fields, applies the format rules (no spoken text off camera), then validates with Zod. */
export function normalizeScript(value: unknown, format: BlueprintFormat): Script {
  const raw = obj(value);
  const spoken = BLUEPRINT_FORMAT_RULES[format].spoken;
  const hook = obj(raw.hook);
  const beats = (Array.isArray(raw.beats) ? raw.beats : []).map((b) => {
    const beat = obj(b);
    return { label: str(beat.label), spoken: spoken ? str(beat.spoken) : '', onScreen: str(beat.onScreen), visual: str(beat.visual), rehook: str(beat.rehook) };
  });
  const candidate = {
    title: str(raw.title),
    hook: { visual: str(hook.visual), onScreen: str(hook.onScreen), spoken: spoken ? str(hook.spoken) : '' },
    beats,
    cta: str(raw.cta),
    caption: str(raw.caption),
    tips: (Array.isArray(raw.tips) ? raw.tips : []).map(str).filter(Boolean).slice(0, 5),
  };
  const range = BEAT_RANGE[format];
  if (beats.length < range.min || beats.length > range.max) throw invalidScript(`${beats.length} beats, ${format} needs ${range.min} to ${range.max}`);
  if (spoken && beats.some((b) => !b.spoken)) throw invalidScript('a talking head beat has no spoken line');
  if (!spoken && beats.some((b) => !b.onScreen)) throw invalidScript('a slide or shot has no on-screen text');
  const parsed = scriptSchema.safeParse(candidate);
  if (!parsed.success) throw invalidScript(parsed.error.issues[0]?.message ?? 'schema');
  return parsed.data;
}
