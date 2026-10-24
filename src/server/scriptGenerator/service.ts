// server-only. Calls the Anthropic Messages API with a forced tool call so the output is always structured JSON.
import {
  DEFAULT_SCRIPT_MODEL,
  HOOK_ANGLES,
  isScriptModel,
  SCRIPT_FORMATS,
  SCRIPT_GOALS,
  SCRIPT_STRUCTURES,
  type GeneratedScript,
  type GenerateScriptInput,
  type HookOption,
  type HooksInput,
  type RefineScriptResult,
  type ScriptModel,
  type ScriptHook,
} from '../../types/admin/scriptGenerator';
import { isCarouselTemplate } from '../../types/admin/carouselTemplates';
import { HttpError } from '../http';
import { callClaude, type ToolDef } from './anthropic';
import { callOpenAi } from './openai';
import { buildGenerateSystem, buildHooksSystem, buildRefineSystem, HOOKS_SCHEMA, SCRIPT_SCHEMA } from './prompts';

const callModel = (model: ScriptModel, system: string, user: string, tool: ToolDef): Promise<unknown> =>
  model === 'claude' ? callClaude(system, user, tool) : callOpenAi(system, user, tool);

/** The model named in a request body. Absent means the default; anything else is a 400. */
export function parseModel(value: unknown): ScriptModel {
  if (value === undefined || value === null || value === '') return DEFAULT_SCRIPT_MODEL;
  if (!isScriptModel(value)) throw new HttpError(400, 'bad_request', 'Unknown model');
  return value;
}

const clean = (value: unknown, max = 1500): string => String(value ?? '').trim().slice(0, max);

function asScript(value: unknown): GeneratedScript {
  const s = value as Partial<GeneratedScript> | null;
  if (!s || !Array.isArray(s.beats) || s.beats.length < 3 || !s.directorNote) throw new HttpError(502, 'invalid_script', 'Model returned an invalid script. Try again.');
  return s.format === 'carousel' ? asCarousel(s as GeneratedScript) : (s as GeneratedScript);
}

/** A carousel has no time line: each beat is a slide, numbered by its index, with nothing spoken. */
function asCarousel(s: GeneratedScript): GeneratedScript {
  const beats = s.beats.map((b, i) => ({ ...b, start: i, end: i + 1, spoken: '', rehook: '', rehookAt: undefined }));
  return { ...s, beats, durationSeconds: beats.length };
}

const bad = (message: string) => new HttpError(400, 'bad_request', message);

/** Validates the fields shared by the hooks and generate requests. */
export function parseHooksInput(body: Record<string, unknown>): HooksInput {
  const { format, goal } = body;
  if (typeof format !== 'string' || !(format in SCRIPT_FORMATS)) throw bad('Unknown format');
  if (typeof goal !== 'string' || !(goal in SCRIPT_GOALS)) throw bad('Unknown goal');
  const audience = clean(body.audience);
  const message = clean(body.message);
  if (!audience || !message) throw bad('Audience and message are required.');
  const template = format === 'carousel' ? body.template ?? body.structure : undefined;
  if (template !== undefined && !isCarouselTemplate(template)) throw bad('Unknown carousel template');
  return {
    format: format as HooksInput['format'],
    goal: goal as HooksInput['goal'],
    audience,
    message,
    credibility: clean(body.credibility),
    ...(template ? { template } : {}),
  };
}

/** The chosen hook, trimmed and length-limited. Null when absent; 400 when present but unusable. */
export function parseHook(value: unknown): ScriptHook | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object') throw bad('Hook must be an object.');
  const h = value as Record<string, unknown>;
  const hook = { visual: clean(h.visual, 400), text: clean(h.text, 80), verbal: clean(h.verbal, 400) };
  if (!hook.visual || !hook.text) throw bad('Hook needs a visual and on-screen text.');
  return hook;
}

/** Throws a 400 HttpError when the body is not a valid generate request. */
export function parseGenerateInput(body: Record<string, unknown>): GenerateScriptInput {
  const { structure } = body;
  const carousel = body.format === 'carousel';
  const known = carousel ? isCarouselTemplate(structure) : typeof structure === 'string' && (structure === 'ai_choose' || structure in SCRIPT_STRUCTURES);
  if (!known) throw bad(carousel ? 'Unknown carousel template' : 'Unknown structure');
  const base = parseHooksInput(body);
  delete base.template;
  const hook = parseHook(body.hook);
  return { ...base, structure: structure as GenerateScriptInput['structure'], ...(hook ? { hook } : {}) };
}

const userBlock = (i: HooksInput) =>
  `<audience>${i.audience}</audience>\n<message_and_takeaway>${i.message}</message_and_takeaway>\n<credibility>${i.credibility || '(none given)'}</credibility>`;

/** Keeps only well-formed hooks. Needs 3 hooks with 3 different angles, otherwise the model output is rejected. */
export function validateHooks(value: unknown, silent: boolean): HookOption[] {
  const raw = (value as { hooks?: unknown } | null)?.hooks;
  const hooks: HookOption[] = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    const h = item as Record<string, unknown>;
    const angle = HOOK_ANGLES.find((a) => a === h.angle);
    const visual = clean(h.visual, 400);
    const text = clean(h.text, 80);
    const verbal = silent ? '' : clean(h.verbal, 400);
    if (angle && visual && text && (silent || verbal)) hooks.push({ angle, visual, text, verbal });
  }
  const picked = hooks.filter((h, i) => hooks.findIndex((o) => o.angle === h.angle) === i).slice(0, 3);
  if (picked.length < 3) throw new HttpError(502, 'invalid_hooks', 'Model returned fewer than 3 usable hooks. Try again.');
  return picked;
}

export async function generateHooks(input: HooksInput, model: ScriptModel = DEFAULT_SCRIPT_MODEL): Promise<HookOption[]> {
  const tool: ToolDef = { name: 'submit_hooks', description: 'Submit the 3 hook options.', input_schema: HOOKS_SCHEMA };
  return validateHooks(await callModel(model, buildHooksSystem(input), userBlock(input), tool), input.format !== 'talking_head');
}

export async function generateScript(input: GenerateScriptInput, model: ScriptModel = DEFAULT_SCRIPT_MODEL): Promise<GeneratedScript> {
  const user = userBlock(input);
  const tool: ToolDef = { name: 'submit_script', description: 'Submit the finished script.', input_schema: SCRIPT_SCHEMA };
  return asScript(await callModel(model, buildGenerateSystem(input), user, tool));
}

type RefineOut = { refused?: boolean; message?: string; script?: unknown };

export async function refineScript(script: GeneratedScript, rawInstruction: unknown, model: ScriptModel = DEFAULT_SCRIPT_MODEL): Promise<RefineScriptResult> {
  const instruction = clean(rawInstruction, 500);
  if (!instruction) throw new HttpError(400, 'bad_request', 'Script and instruction are required.');
  const tool: ToolDef = {
    name: 'submit_edit',
    description: 'Submit the edited script, or refuse if the request is off topic.',
    input_schema: {
      type: 'object',
      properties: {
        refused: { type: 'boolean' },
        message: { type: 'string', description: 'One sentence. If edited: what changed. If refused: why.' },
        script: SCRIPT_SCHEMA,
      },
      required: ['refused', 'message', 'script'],
    },
  };
  const user = `<script>${JSON.stringify(script)}</script>\n<instruction>${instruction}</instruction>`;
  const out = (await callModel(model, buildRefineSystem(), user, tool)) as RefineOut;
  const refused = !!out.refused;
  return { refused, message: out.message ?? '', script: refused ? script : asScript(out.script) };
}
