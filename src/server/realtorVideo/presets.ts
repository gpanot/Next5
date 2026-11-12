// Listing-video templates and lengths. Pure data: safe to import anywhere (app, worker, CLI).
// editorial + rate are the first two (2026-11-11); the five others were added 2026-11-12.

export const REALTOR_PRESETS = ['editorial', 'rate', 'pov', 'day', 'top3', 'alert', 'luxe'] as const;
export type RealtorPreset = (typeof REALTOR_PRESETS)[number];

/** short = 15 s (free plan), standard = 25 s, auto = the full story, up to 60 s. */
export const VIDEO_LENGTHS = ['short', 'standard', 'auto'] as const;
export type VideoLength = (typeof VIDEO_LENGTHS)[number];

export type MusicTrack = 'warm' | 'pop';

type PresetMeta = {
  name: string;
  line: string;
  composition: string;
  voice: string;
  music: MusicTrack;
};

export const PRESET_META: Record<RealtorPreset, PresetMeta> = {
  editorial: { name: 'Editorial tour', line: 'Calm, magazine look. Ends on the price.', composition: 'RealtorEditorialVoiced', voice: 'Sulafat', music: 'warm' },
  rate: { name: 'Rate this house', line: 'Room by room. Asks viewers for a 1–10.', composition: 'RealtorRateVoiced', voice: 'Achird', music: 'pop' },
  pov: { name: 'POV: you live here', line: 'Told to the viewer, like they just moved in.', composition: 'RealtorPovVoiced', voice: 'Sulafat', music: 'pop' },
  day: { name: 'A day in this home', line: 'Morning to night, one room at a time.', composition: 'RealtorDayVoiced', voice: 'Sulafat', music: 'warm' },
  top3: { name: '3 things I love', line: 'A numbered countdown of the best parts.', composition: 'RealtorTop3Voiced', voice: 'Achird', music: 'pop' },
  alert: { name: 'New listing alert', line: 'Bright yellow series look, photo cards and notes.', composition: 'RealtorAlertVoiced', voice: 'Sulafat', music: 'pop' },
  luxe: { name: 'Luxury showcase', line: 'Dark and slow, big glass titles. For high-end homes.', composition: 'RealtorLuxeVoiced', voice: 'Achird', music: 'warm' },
};

/** What the length picker shows. Only short is open to workspaces that have never paid. */
export const LENGTH_META: Record<VideoLength, { label: string; line: string; paidOnly: boolean }> = {
  short: { label: '15 s', line: 'Hook + 3 rooms', paidOnly: false },
  standard: { label: '25 s', line: 'The full tour', paidOnly: true },
  auto: { label: 'Auto', line: 'The home’s story, up to 60 s', paidOnly: true },
};

/** Shortest video per length; auto has no floor (the story sets it) and stops at 60 s. */
export const LENGTH_FLOOR_S: Record<VideoLength, number> = { short: 15, standard: 25, auto: 15 };
export const MAX_DURATION_S = 60;

/**
 * Spoken words (end lines included) that fit each length. Measured 2026-11-12 on Gemini TTS: ~2.6 words/s,
 * plus ~2 s of tail. Over the top number, room beats are dropped from the end (storyScript.fitBudget).
 */
export const WORD_BUDGET: Record<VideoLength, [number, number]> = { short: [28, 34], standard: [54, 62], auto: [110, 140] };

/** Room photos after the hook (and location) beat. */
export const ROOM_BEATS: Record<VideoLength, number> = { short: 3, standard: 6, auto: 8 };

export const isRealtorPreset = (v: unknown): v is RealtorPreset => typeof v === 'string' && (REALTOR_PRESETS as readonly string[]).includes(v);
export const isVideoLength = (v: unknown): v is VideoLength => typeof v === 'string' && (VIDEO_LENGTHS as readonly string[]).includes(v);
