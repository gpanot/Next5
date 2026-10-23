// server-only. The quality of the scripts lives in these strings: edit them to change how scripts are written.
import {
  HOOK_ANGLES,
  SCRIPT_FORMATS,
  SCRIPT_GOALS,
  SCRIPT_STRUCTURES,
  type GenerateScriptInput,
  type HooksInput,
  type ScriptHook,
  type ScriptStructure,
} from '../../types/admin/scriptGenerator';

export const PRINCIPLES = [
  { name: 'Name the viewer', text: "The first line must identify one specific viewer and one specific tension. Generic hooks like 'how to know if you are ready' are dead. Specific ones are alive." },
  { name: 'Earn the right', text: 'Credibility comes from lived experience or a real result or number, never a job title. Place it inside the first 10 seconds. If the creator gave no real number or result, use a stake or a time frame instead. Never invent a statistic, credential or story.' },
  { name: 'One idea', text: 'The video carries exactly one takeaway: one feeling, one shift, or one decision. Cut anything that does not serve it.' },
  { name: 'Hold the payoff', text: 'Do not give the answer away early. Keep the payoff for the late beats so curiosity carries the viewer through the body.' },
  { name: 'Turn with But', text: "Move from struggle to solution with 'But' or 'Therefore', never 'and then', so the shift feels earned instead of effortless." },
  { name: 'Stack the hook', text: 'The opening is three aligned signals promising the same thing: a first frame that shows a transformation, pain or surprise; an on-screen line of 3 to 5 bold words; and a spoken line that names the viewer, the pain and a withheld mechanism. If they do not all point at one promise, rewrite them.' },
  { name: 'Re-hook', text: 'Reset attention every 3 to 7 seconds with a short line that raises a new question, corrects a common belief, or teases the next step. The body must still deliver exactly what the hook promised.' },
  { name: 'One honest CTA', text: 'End with a single action that matches the goal. Attract gets a soft invitation to follow. Convert gets one concrete action. Never stack two asks.' },
];

const principlesText = PRINCIPLES.map((p, i) => `${i + 1}. ${p.name}: ${p.text}`).join('\n');
const structureKeys = Object.keys(SCRIPT_STRUCTURES) as ScriptStructure[];

const beatProps = {
  start: { type: 'number' },
  end: { type: 'number' },
  label: { type: 'string' },
  onScreen: { type: 'string' },
  spoken: { type: 'string' },
  broll: { type: 'string' },
  rehook: { type: 'string', description: 'Short line that resets attention inside this beat.' },
  rehookAt: { type: 'number', description: 'The second the re-hook lands.' },
};

export const SCRIPT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    format: { type: 'string', enum: Object.keys(SCRIPT_FORMATS) },
    structure: { type: 'string', enum: structureKeys },
    durationSeconds: { type: 'number' },
    music: { type: 'string' },
    beats: { type: 'array', items: { type: 'object', properties: beatProps, required: ['start', 'end', 'label'] } },
    cta: { type: 'string' },
    directorNote: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: '2 to 3 sentences: the emotional spine and how the CTA fits the goal.' },
        decisions: {
          type: 'array',
          description: 'Exactly 5 decisions.',
          items: {
            type: 'object',
            properties: {
              choice: { type: 'string', description: 'What you did, past tense.' },
              rule: { type: 'string', description: 'Which principle justified it, and why, in one sentence.' },
            },
            required: ['choice', 'rule'],
          },
        },
      },
      required: ['summary', 'decisions'],
    },
  },
  required: ['title', 'format', 'structure', 'durationSeconds', 'beats', 'cta', 'directorNote'],
} as const;

function structureBlock(structure: GenerateScriptInput['structure']): string {
  if (structure !== 'ai_choose') {
    const s = SCRIPT_STRUCTURES[structure];
    return `STRUCTURE: ${s.label}\nBeats in order: ${s.beats.join(' | ')}\nTiming guide: ${s.timing}`;
  }
  const options = structureKeys.map((k) => `- ${k}: ${SCRIPT_STRUCTURES[k].desc} Beats: ${SCRIPT_STRUCTURES[k].beats.join(' | ')}`);
  return `STRUCTURE: choose the best fit for the creator's input from:\n${options.join('\n')}\nSet the 'structure' field to the key you chose.`;
}

function hookBlock(hook: ScriptHook | undefined): string {
  if (!hook) return '';
  return `CHOSEN HOOK, use exactly, do not rewrite it:
- visual: ${hook.visual}
- text: ${hook.text}
- verbal: ${hook.verbal || '(none, silent film)'}
Place visual in broll, text in onScreen and verbal in spoken on the first beat. Everything after must deliver that promise.

`;
}

export function buildGenerateSystem({ format, structure, goal, hook }: Pick<GenerateScriptInput, 'format' | 'structure' | 'goal' | 'hook'>): string {
  const f = SCRIPT_FORMATS[format];
  return `You are a short-form video script coach. You write scripts for a creator to film themselves.

PRINCIPLES (apply all, and cite them by name in the director's note):
${principlesText}

FORMAT: ${f.label} (${f.range}, target about ${f.seconds} seconds)
${f.rules}

${structureBlock(structure)}

GOAL: ${SCRIPT_GOALS[goal].label}. CTA guidance: ${SCRIPT_GOALS[goal].cta}

${hookBlock(hook)}Rules for output:
- On the HOOK beat, 'broll' is the visual first frame (0 to 1 seconds), 'onScreen' is the 3 to 5 word text, 'spoken' is the verbal hook.
- No stretch longer than 7 seconds without a re-hook. Put it in the beat's 'rehook' field and its second in 'rehookAt'. The hook beat's own re-hook lands at 4 to 7 seconds.
- Use only facts the creator gave you. Never invent statistics, credentials or stories.
- Beats must be contiguous: each 'start' equals the previous 'end', the last 'end' equals durationSeconds.
- Write in the creator's voice, first person, plain words.
- The directorNote has a short summary and exactly 5 decisions, each tied to a named principle.
- Do not use em dashes anywhere in the output.
Return the result by calling the submit_script tool.`;
}

export function buildRefineSystem(): string {
  return `You edit exactly one thing: the short-form video script provided by the user. Apply the user's instruction to the script and return the full updated script.
If the instruction is not about editing this script (questions, other tasks, unrelated chat), set refused to true, put a one-sentence polite refusal in message, and return the script unchanged.
Keep the same JSON shape, keep beats contiguous, keep all PRINCIPLES intact, and update the directorNote so it still explains the current script.
Do not use em dashes anywhere. Always reply by calling the submit_edit tool.

PRINCIPLES:
${principlesText}`;
}

export const HOOKS_SCHEMA = {
  type: 'object',
  properties: {
    hooks: {
      type: 'array',
      description: 'Exactly 3 hooks, each with a different angle.',
      items: {
        type: 'object',
        properties: {
          angle: { type: 'string', enum: HOOK_ANGLES },
          visual: { type: 'string', description: 'A concrete, filmable first frame.' },
          text: { type: 'string', description: '3 to 5 bold words shown on screen.' },
          verbal: { type: 'string', description: '1 to 2 short spoken sentences. Empty for silent film.' },
        },
        required: ['angle', 'visual', 'text', 'verbal'],
      },
    },
  },
  required: ['hooks'],
} as const;

export function buildHooksSystem({ format, goal }: Pick<HooksInput, 'format' | 'goal'>): string {
  const silent = format === 'silent_film';
  return `You are a short-form video hook writer. You write the opening of a video that a creator will film themselves.

PRINCIPLES (the first two matter most here):
${principlesText}

Write exactly 3 hooks for the creator's idea. Each hook uses a different angle from: ${HOOK_ANGLES.join(', ')}.
- contrarian: attack a belief the viewer holds.
- pain: name the pain the viewer feels right now.
- stakes: show what the viewer loses by waiting.
- proof: lead with a real result or number the creator gave.
- mistake: name the mistake the viewer is making.
Each hook has three aligned signals that promise the same thing:
- visual: a concrete first frame the creator can film in 0 to 1 seconds.
- text: 3 to 5 bold words shown on screen.
- verbal: ${silent ? 'leave empty, this is a silent film.' : '1 to 2 short spoken sentences that name the viewer, the pain and a withheld mechanism.'}

GOAL: ${SCRIPT_GOALS[goal].label}.
Rules:
- Use only facts the creator gave you. Never invent statistics, credentials or stories. Use the proof angle only if the creator gave a real number or result, otherwise pick another angle.
- Plain words, first person where it fits.
- Do not use em dashes anywhere.
Return the result by calling the submit_hooks tool.`;
}
