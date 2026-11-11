// The board animations of the measured look (stolen/scenes.json, written by /copy-viral-steal): engine scenes per
// shot, timed on the shot instead of in seconds, so they land on Guillaume's own take. Pure, so it is unit tested.
//
// In scenes.json every `from`, `to` and `at` (at any depth) is one of:
//   a number 0..1   = that share of the shot (0 = its first frame, 1 = its last)
//   "cue:<words>"   = when Guillaume says those words in the shot (falls back to the shot start)
// `to: 1` on the last shot is dropped, so the scene holds to the end like the engine's last scene.

import type { ShotSpan } from './assemble';
import { cueTime, type SpokenWord } from './reveal';

/** 0-based shot index → its scenes, as written (times still relative). */
export type ScenePlan = Record<number, unknown[]>;

const TIME_KEYS = new Set(['from', 'to', 'at']);
const r2 = (n: number) => Math.round(n * 100) / 100;

/** stolen/scenes.json ({"shots": {"1": [...], ...}}, 1-based) as a plan; throws on a bad file. */
export const parseScenePlan = (raw: unknown, shotCount: number): ScenePlan => {
  const shots = (raw as { shots?: unknown } | null)?.shots;
  if (!shots || typeof shots !== 'object' || Array.isArray(shots)) throw new Error('scenes.json needs {"shots": {"1": [...]}}');
  const plan: ScenePlan = {};
  for (const [key, scenes] of Object.entries(shots)) {
    const n = Number(key);
    if (!Number.isInteger(n) || n < 1 || n > shotCount) throw new Error(`scenes.json: no shot ${key} (1 to ${shotCount})`);
    if (!Array.isArray(scenes) || scenes.some((s) => !s || typeof s !== 'object' || Array.isArray(s))) throw new Error(`scenes.json: shot ${key} must be a list of scene objects`);
    plan[n - 1] = scenes;
  }
  return plan;
};

type Ctx = { span: ShotSpan; words: SpokenWord[]; last: boolean };

const resolveTime = (value: unknown, key: string, ctx: Ctx): unknown => {
  const { from, to } = ctx.span;
  if (typeof value === 'number' && value >= 0 && value <= 1) return r2(from + value * (to - from));
  if (typeof value === 'string' && value.startsWith('cue:')) return cueTime(value.slice(4), ctx.words, from, to) ?? r2(from);
  throw new Error(`"${key}" must be a share of the shot (0 to 1) or "cue:<words>", got ${JSON.stringify(value)}`);
};

const resolveNode = (node: unknown, ctx: Ctx): unknown => {
  if (Array.isArray(node)) return node.map((n) => resolveNode(n, ctx));
  if (!node || typeof node !== 'object') return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (!TIME_KEYS.has(key)) out[key] = resolveNode(value, ctx);
    else if (!(key === 'to' && value === 1 && ctx.last)) out[key] = resolveTime(value, key, ctx);
  }
  return out;
};

/** The plan's scenes in seconds of the joined take, for the shots of this job (`spans` in shot order). */
export const resolveScenePlan = (plan: ScenePlan, spans: ShotSpan[], words: SpokenWord[]): unknown[] =>
  spans.flatMap((span, i) => (plan[span.index] ?? []).map((scene) => resolveNode(scene, { span, words, last: i === spans.length - 1 })));
