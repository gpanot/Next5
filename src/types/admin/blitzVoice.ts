// Blitz voiceover (2026-10-12): Blitz cards are narrated like a short explainer instead of carrying music.
// The voice is one of a few Gemini prebuilt voices, picked per card; the narration itself is written and recorded
// when the video is rendered (src/server/labs/blitzVoice.ts).

export type BlitzVoiceName = 'Sulafat' | 'Achird' | 'Kore';

export type BlitzVoiceOption = {
  name: BlitzVoiceName;
  /** What the user sees: "Warm", "Friendly"… */
  label: string;
  gender: 'female' | 'male';
  /** A short sample line in this voice (null when it could not be made). */
  sampleUrl: string | null;
};

/** The voices a card can take, in the order the voice button cycles through them. */
export const BLITZ_VOICES: ReadonlyArray<Omit<BlitzVoiceOption, 'sampleUrl'>> = [
  { name: 'Sulafat', label: 'Warm', gender: 'female' },
  { name: 'Achird', label: 'Friendly', gender: 'male' },
  { name: 'Kore', label: 'Confident', gender: 'female' },
];

export const DEFAULT_BLITZ_VOICE: BlitzVoiceName = 'Sulafat';

export const isBlitzVoice = (v: unknown): v is BlitzVoiceName => BLITZ_VOICES.some((o) => o.name === v);

/** The next voice after `current` (the voice button cycles). */
export const nextBlitzVoice = (current: string | undefined): BlitzVoiceName => {
  const i = BLITZ_VOICES.findIndex((o) => o.name === current);
  return BLITZ_VOICES[(i + 1) % BLITZ_VOICES.length]!.name;
};

export const blitzVoiceLabel = (name: string | undefined): string =>
  BLITZ_VOICES.find((o) => o.name === (name ?? DEFAULT_BLITZ_VOICE))?.label ?? 'Voice';
