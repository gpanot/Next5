// server-only — never import from a 'use client' file.
// The intro video's own voice (2026-10-17): Veo 3.1 makes up a new voice for every clip and returns no voice id, so the
// only copy of it is the audio inside the mp4. "Change voice" plays that audio as a reference and Gemini 3.6 Flash
// listens to it to pick the closest Gemini prebuilt voice, which becomes the Recommended one. A close match, not a clone.

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { BrandCastMember } from '@prisma/client';
import type { VoiceGender } from '../../types/admin/shorts';
import { GEMINI_FLASH, openRouterChat, parseJsonObject } from '../ai/openrouter';
import { ffmpeg, withTempDir } from '../shorts/ffmpeg';
import { GEMINI_VOICES } from '../shorts/voices';
import { getObject, putObject } from '../storage/objectStore';

/** The intro video's audio as a stored wav (24 kHz mono). Null when there is no ready intro or it could not be read. */
export const extractIntroVoice = async (m: BrandCastMember): Promise<{ key: string; wav: Buffer } | null> => {
  if (m.introStatus !== 'ready' || !m.introVideoKey) return null;
  try {
    const video = await getObject(m.introVideoKey);
    if (!video) return null;
    const wav = await withTempDir(async (dir) => {
      const input = path.join(dir, 'intro.mp4');
      const output = path.join(dir, 'intro.wav');
      await writeFile(input, video);
      await ffmpeg(['-y', '-i', input, '-vn', '-ac', '1', '-ar', '24000', '-c:a', 'pcm_s16le', output], 60_000);
      return readFile(output);
    });
    const key = `brand-cast/${m.workspaceId}/${m.id}-intro-voice-${Date.now()}.wav`;
    await putObject(key, wav, 'audio/wav');
    return { key, wav };
  } catch (err) {
    console.warn(`[brand-cast] intro voice of ${m.id} could not be read:`, err instanceof Error ? err.message.slice(0, 160) : err);
    return null;
  }
};

const SYSTEM = (gender: VoiceGender) => `You match voices. Listen to the speaker in the audio, then pick the ONE voice from
this list that sounds the most like them: pitch, age, warmth, energy, pace and accent.
${Object.entries(GEMINI_VOICES).filter(([, v]) => v.gender === gender).map(([name, v]) => `${name} (${v.style})`).join(', ')}
Return JSON with flat keys only: {"voice": string, "why": string}. The name exactly as listed; why under 12 words, simple words.`;

/** The Gemini prebuilt voice closest to the intro's voice, of the person's gender. Null when Gemini gives none. */
export const closestVoice = async (wav: Buffer, gender: VoiceGender): Promise<{ name: string; why: string } | null> => {
  const text = await openRouterChat(
    [
      { role: 'system', content: SYSTEM(gender) },
      { role: 'user', content: [{ type: 'text', text: 'Which voice is closest to this speaker?' }, { type: 'input_audio', input_audio: { data: wav.toString('base64'), format: 'wav' } }] },
    ],
    { model: GEMINI_FLASH, maxTokens: 400, reasoning: 'low', timeoutMs: 40_000 },
  );
  const raw = parseJsonObject(text);
  const name = typeof raw?.voice === 'string' ? raw.voice.trim() : '';
  if (GEMINI_VOICES[name]?.gender !== gender) return null;
  return { name, why: typeof raw?.why === 'string' ? raw.why.trim().slice(0, 120) : '' };
};
