// Admin › Copy Viral Post: a viral reel taken apart shot by shot, to be recorded again by Guillaume.
// Runs on localhost only; a project is a folder on disk (.data/copy-viral/<id>/project.json + media).

/** READING = transcript, shot reading and new lines being made; RENDERING = the edit being made (both after READY). */
export type CopyViralStatus = 'DOWNLOADING' | 'ANALYZING' | 'READING' | 'RENDERING' | 'READY' | 'FAILED';

/** What the reference does in one shot, read by Gemini from its stills. Empty strings until the shots are read. */
export type CopyViralShotReading = {
  /** full_cam | split | text_card | broll | screen | other */
  layout: string;
  /** e.g. "medium close-up, eye level, centered" */
  framing: string;
  /** Face height as a % of the frame height, 0 when no face. */
  facePct: number;
  /** static | punch_in | push_in | handheld | pan */
  movement: string;
  /** How to record it: pose, gesture, expression, prop, place. */
  direction: string;
  /** Text burned on screen (not the spoken captions). */
  onScreenText: string;
  /** Boards, screenshots, logos or B-roll laid over the camera. */
  overlays: string;
  /** The picture behind the person when they are cut out (green screen), for an image generator; '' = a real room. */
  background: string;
};

/** Guillaume's uploaded take of one shot. */
export type CopyViralClip = {
  file: string;
  durationMs: number;
  width: number;
  height: number;
  fps: number;
  uploadedAt: string;
  /** landscape, low resolution, too short… shown on the card, never blocking. */
  warnings: string[];
};

export type CopyViralShot = {
  index: number;
  /** The picture scene of the reference this shot belongs to (0-based). Sentence cuts split one scene into several
   *  shots; they share its background and are previewed together. */
  sequence: number;
  startMs: number;
  endMs: number;
  /** How long Guillaume's version of this shot should run. Starts as the reference length. */
  targetMs: number;
  /** Media path of the still from the middle of the shot, relative to the project folder. */
  frame: string | null;
  /** What is said in this shot of the reference (Whisper). */
  transcript: string;
  reading: CopyViralShotReading | null;
  /** Guillaume's spoken line: the original with small changes for Next5 / @happygiom. Editable. */
  myLine: string;
  /** Guillaume's on-screen text for this shot. Editable. */
  myOnScreenText: string;
  clip: CopyViralClip | null;
  /** Media path of the picture to put behind me (green screen look); null = my real room. */
  background: string | null;
  /** The description the sequence's picture was last made from ('' = never made). */
  backgroundText: string;
};

/** The reference's look, read once for the whole reel. Flat strings, kept for the render step. */
export type CopyViralStyle = {
  captionFont: string;
  captionCase: string;
  captionPosition: string;
  captionWordsPerLine: number;
  captionHighlight: string;
  colors: string;
  grade: string;
  transitions: string;
  hook: string;
  cta: string;
  music: string;
  soundEffects: string;
  notes: string;
};

/** 1080×1920 = the final; 720×1280 = a quick draft to check timing and look. */
export type CopyViralCutMode = 'sentences' | 'pictures';

/** auto = fixed rules from the reading; claude = Claude Code (/copy-viral-render skill) refines the edit to match the original. */
export type CopyViralDirector = 'auto' | 'claude';

export type CopyViralResolution = '1080x1920' | '720x1280';

/** The last edit made from Guillaume's takes with the local engine. Media paths are relative to the project folder. */
export type CopyViralEdit = {
  status: 'RUNNING' | 'DONE' | 'FAILED';
  /** What the engine is doing now, in words. */
  step: string;
  resolution: CopyViralResolution;
  director?: CopyViralDirector;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  video: string | null;
  poster: string | null;
  srt: string | null;
  /** One still per shot, to check before watching. */
  sheet: string | null;
  durationMs: number;
};

/** A quick 720 render of one sequence from my takes, to check it before the whole edit. */
export type CopyViralPreview = {
  status: 'RUNNING' | 'DONE' | 'FAILED';
  step: string;
  director?: CopyViralDirector;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  video: string | null;
  /** The takes it was made from (file paths), to tell when it is out of date. */
  takes: string[];
};

/**
 * The reel's look measured by Claude Code (/copy-viral-steal, built on the /steal skill) instead of guessed from
 * Gemini's words: stolen/style.json (engine style), stolen/STYLE.md (what was measured), stolen/hints.json.
 * When DONE, the edit uses it in place of the style mapped from Gemini's words.
 */
export type CopyViralSteal = {
  status: 'RUNNING' | 'DONE' | 'FAILED';
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  /** A few lines from Claude Code: what was measured and copied. */
  summary: string;
  /** measure = the whole look measured on this reel; boards = only the board animations, on a saved setup's look. */
  mode?: 'measure' | 'boards';
  /** The saved setup this look comes from or was saved as, by name. */
  setup?: string | null;
  /** How many shots have board animations (scenes.json); 0 right after a saved setup is applied. */
  boards?: number;
};

/** A measured look saved to reuse on another reel of the same creator (theme, layout numbers, board examples). */
export type CopyViralSetup = {
  slug: string;
  name: string;
  /** The project it was measured on. */
  fromProject: string;
  fromTitle: string;
  summary: string;
  savedAt: string;
};

export type CopyViralProject = {
  id: string;
  title: string;
  referenceUrl: string | null;
  status: CopyViralStatus;
  error: string | null;
  /** Media path of the reference video, relative to the project folder. */
  reference: string | null;
  durationMs: number;
  width: number;
  height: number;
  fps: number;
  /** scdet threshold the cuts were found with: lower finds more cuts (and more false ones from overlays). */
  cutThreshold: number;
  /** sentences = picture cuts moved to sentence ends + long shots split by 1-2 sentences (easy to record); pictures = raw cuts. */
  cutMode: CopyViralCutMode;
  style: CopyViralStyle | null;
  /** Post caption for Guillaume's version. */
  myCaption: string;
  edit: CopyViralEdit | null;
  steal: CopyViralSteal | null;
  /** Sequence number → its last quick preview. */
  previews: Record<string, CopyViralPreview>;
  shots: CopyViralShot[];
  createdAt: string;
  updatedAt: string;
};

/** A shot as the cut editor sends it back: boundaries and target only, frames are made on the server. */
export type CopyViralShotEdit = Pick<CopyViralShot, 'startMs' | 'endMs' | 'targetMs'>;

/** Same room, same light: camera changes score low, so the default sits under the /steal skill's 12. */
export const CUT_SENSITIVITY = [
  { label: 'Fewer cuts', threshold: 14 },
  { label: 'Normal', threshold: 9 },
  { label: 'More cuts', threshold: 6 },
] as const;
export const DEFAULT_CUT_THRESHOLD = 9;

export const isCopyViralBusy = (status: CopyViralStatus) =>
  status === 'DOWNLOADING' || status === 'ANALYZING' || status === 'READING' || status === 'RENDERING';

/** URL of a project file for <img>/<video>: those tags cannot send the Authorization header. */
export const copyViralMediaUrl = (token: string, id: string, file: string, version?: string) =>
  `/api/admin/copy-viral/${id}/media/${file}?token=${encodeURIComponent(token)}${version ? `&v=${encodeURIComponent(version)}` : ''}`;
