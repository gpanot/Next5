// server-only. Reads a script aloud with the man's voice: Gemini 3.8 Flash TTS (via treg), the same voice stack as Blitz
// and Shorts. Measured 2026-10-22: a 50 s script (15 sentences) took 6 s and cost about $0.013.
import { createMeter } from '../metaAds/cost';
import { HttpError } from '../http';
import { synthesize } from '../shorts/voice';

/** Achird, "Friendly": the male narrator Blitz uses. */
export const SCRIPT_VOICE = 'Achird';
const DIRECTION = 'A friendly expert talking to the camera: warm, clear and grounded, natural conversational pace, never salesy.';
/** About 75 s of speech. Keeps the WAV under the 4.5 MB response limit of a serverless function. */
export const MAX_VOICE_CHARS = 1200;

export type ScriptVoiceResult = { wav: Buffer; durationS: number; costUsd: number };

/** The text a script is read as, or a 400 HttpError when there is nothing to read or too much. */
export function parseVoiceText(value: unknown): string {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) throw new HttpError(400, 'bad_request', 'There is no spoken text to read.');
  if (text.length > MAX_VOICE_CHARS) throw new HttpError(400, 'bad_request', `The script is too long to read aloud (max ${MAX_VOICE_CHARS} characters).`);
  return text;
}

export async function readAloud(text: string): Promise<ScriptVoiceResult> {
  const meter = createMeter();
  try {
    // No Whisper read-back or word timings: this is a listen-through, and both passes add seconds and cost.
    const take = await synthesize(text, { voice: SCRIPT_VOICE, direction: DIRECTION }, meter, { readBack: false, wordTimings: false });
    return { wav: take.wav, durationS: take.durationS, costUsd: meter.summary().usdMicros / 1_000_000 };
  } catch (err) {
    throw new HttpError(502, 'tts_error', err instanceof Error ? err.message.slice(0, 200) : 'Voice generation failed. Try again.');
  }
}
