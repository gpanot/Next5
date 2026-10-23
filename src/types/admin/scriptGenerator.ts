/** Script Generator: shared by the admin API routes and the admin tab. Client-safe (no server imports). */

export type ScriptFormat = 'talking_head' | 'silent_film';
export type ScriptStructure = 'problem_pursuit_payoff' | 'personal_story' | 'listicle' | 'perspective_shift' | 'myth_buster';
export type ScriptGoal = 'attract' | 'nurture' | 'position' | 'convert';

export type FormatInfo = { label: string; seconds: number; range: string; desc: string; rules: string };
export type StructureInfo = { label: string; tagline: string; desc: string; beats: string[]; timing: string };
export type GoalInfo = { label: string; cta: string };

export const SCRIPT_FORMATS: Record<ScriptFormat, FormatInfo> = {
  talking_head: {
    label: 'Talking Head',
    seconds: 45,
    range: '30 to 60 seconds',
    desc: 'You on camera, talking directly to your viewer. Best for nurture, position and convert content.',
    rules:
      "Every beat has a 'spoken' line in natural spoken language (short sentences, contractions, no jargon). The HOOK beat also has 'onScreen' text, a punchy line shown as the opening caption. 'broll' is a short direction for what the camera shows. Leave 'music' empty.",
  },
  silent_film: {
    label: 'Silent Film',
    seconds: 25,
    range: '20 to 30 seconds',
    desc: 'Visuals plus on-screen text, no voiceover. Music carries the emotion. Best for attract content.',
    rules:
      "There is no voiceover: leave 'spoken' empty on every beat. Every beat has 'onScreen' text (max 12 words) and a 'broll' shot description. Fill 'music' with a short mood and tempo direction.",
  },
};

export const SCRIPT_STRUCTURES: Record<ScriptStructure, StructureInfo> = {
  problem_pursuit_payoff: {
    label: 'Problem > Pursuit > Payoff',
    tagline: 'The classic teaching arc',
    desc: "Best for advice, lessons and 'here is what I learned'. Opens on a pain, walks through the pursuit, lands the payoff.",
    beats: ['HOOK', 'CREDIBILITY / CONTEXT', 'PURSUIT (THE BODY)', 'PAYOFF', 'CTA'],
    timing: 'Hook about 10%, credibility about 12%, pursuit about 33%, payoff about 33%, CTA about 12%.',
  },
  personal_story: {
    label: 'Personal story',
    tagline: 'My experience, in order',
    desc: 'Best for origin stories and transformations. The emotional spine carries the video.',
    beats: ['HOOK', 'BEFORE', 'TURNING POINT', 'AFTER', 'CTA'],
    timing: 'Hook about 10%, before about 25%, turning point about 25%, after about 28%, CTA about 12%.',
  },
  listicle: {
    label: 'Listicle: 3 things I learned',
    tagline: 'Numbered, punchy, scannable',
    desc: 'Best for tactical content. 3 to 5 numbered points with the most powerful one last.',
    beats: ['HOOK', 'POINT 1', 'POINT 2', 'POINT 3 (STRONGEST)', 'CTA'],
    timing: 'Hook about 10%, three points about 25% each, CTA about 15%.',
  },
  perspective_shift: {
    label: 'Perspective shift',
    tagline: 'I used to think X. Now I think Y.',
    desc: 'Best for opinion and contrarian takes. Names the old belief, shows what changed, lands the new belief.',
    beats: ['HOOK (OLD BELIEF)', 'WHY I BELIEVED IT', 'WHAT CHANGED', 'NEW BELIEF', 'CTA'],
    timing: 'Hook about 10%, old belief about 20%, what changed about 30%, new belief about 28%, CTA about 12%.',
  },
  myth_buster: {
    label: 'Myth buster',
    tagline: 'The biggest lie about X is...',
    desc: 'Best for positioning and authority. Names a widely held belief, dismantles it, replaces it with the truth.',
    beats: ['HOOK (THE MYTH)', 'WHY PEOPLE BELIEVE IT', 'WHY IT FAILS', 'THE TRUTH', 'CTA'],
    timing: 'Hook about 10%, why believed about 20%, why it fails about 28%, truth about 30%, CTA about 12%.',
  },
};

export const SCRIPT_GOALS: Record<ScriptGoal, GoalInfo> = {
  attract: { label: 'Attract: grow my audience, reach new people', cta: 'Soft invitation to follow. Low pressure.' },
  nurture: { label: 'Nurture: deepen connection with people who already follow me', cta: 'Invite a reply, a comment or a save. Warm tone.' },
  position: { label: 'Position: show expertise, build trust', cta: 'Point to the next piece of proof or the next video. No hard sell.' },
  convert: { label: 'Convert: drive a specific action (signup, purchase, DM)', cta: 'One concrete action, named clearly, with a reason to do it now.' },
};

/** On the HOOK beat: broll = visual first frame (0 to 1 s), onScreen = 3 to 5 bold words, spoken = verbal hook.
 *  rehook / rehookAt (optional, so older scripts still render): a short line that resets attention, and the second it lands. */
export type ScriptBeat = {
  start: number;
  end: number;
  label: string;
  onScreen?: string;
  spoken?: string;
  broll?: string;
  rehook?: string;
  rehookAt?: number;
};
export type DirectorDecision = { choice: string; rule: string };
export type GeneratedScript = {
  title: string;
  format: ScriptFormat;
  structure: ScriptStructure;
  durationSeconds: number;
  music?: string;
  beats: ScriptBeat[];
  cta: string;
  directorNote: { summary: string; decisions: DirectorDecision[] };
};

export type HookAngle = 'contrarian' | 'pain' | 'stakes' | 'proof' | 'mistake';
export const HOOK_ANGLES: HookAngle[] = ['contrarian', 'pain', 'stakes', 'proof', 'mistake'];

/** The three aligned signals of an opening: first frame, bold on-screen words, spoken line. */
export type ScriptHook = { visual: string; text: string; verbal: string };
export type HookOption = ScriptHook & { angle: HookAngle };

export type GenerateScriptInput = {
  format: ScriptFormat;
  /** A structure key, or 'ai_choose' to let the model pick. */
  structure: ScriptStructure | 'ai_choose';
  goal: ScriptGoal;
  audience: string;
  message: string;
  credibility: string;
  /** A hook picked in the 'Pick your hook' step; the script must use it as is. */
  hook?: ScriptHook;
};

/** What the hooks endpoint needs: the wizard inputs minus structure and hook. */
export type HooksInput = Omit<GenerateScriptInput, 'structure' | 'hook'>;

export type RefineScriptResult = { refused: boolean; message: string; script: GeneratedScript };

/** Text model that writes the hooks, the script and the edits. GPT-6.1 Sol is the default: it is the cheaper one. */
export type ScriptModel = 'gpt-6.1-sol' | 'claude';

export const SCRIPT_MODELS: Record<ScriptModel, { label: string; detail: string }> = {
  'gpt-6.1-sol': { label: 'GPT-6.1 Sol', detail: 'OpenAI · $2 / $10 per 1M tokens · cheaper' },
  claude: { label: 'Claude Sonnet 5.5', detail: 'Anthropic · about $0.20 to $0.30 a script' },
};

export const DEFAULT_SCRIPT_MODEL: ScriptModel = 'gpt-6.1-sol';

export const isScriptModel = (v: unknown): v is ScriptModel => typeof v === 'string' && v in SCRIPT_MODELS;
