// server-only — never import from a 'use client' file.
// A Brand Cast member's intro video (~6 s): "Hi, I'm Maya! … See you on your feed!". The line and the voice are cast in
// one small call; the voice is the Shorts voice step (Gemini TTS, synthesize); the picture is Veo 3.1 Lite animating the
// anchor photo (slow push-in to the face, a smile and a wave, mouth closed: Veo cannot lip-sync our own voice, the user
// chose a voiceover over Veo's own speech on 2026-10-10). ffmpeg puts the voice on the clip.

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import type { BrandCastMember } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { BrandProfile } from '../../types/admin/companyIntel';
import { HttpError } from '../http';
import { createMeter, type CostMeter } from '../metaAds/cost';
import { clip } from '../metaAds/text';
import { ffmpeg, withTempDir } from '../shorts/ffmpeg';
import { creativeJson } from '../shorts/llm';
import { makeClip } from '../shorts/media';
import { synthesize } from '../shorts/voice';
import { defaultVoice, VOICE_CATALOG, voiceGender } from '../shorts/voices';
import { deleteObject, getObject, putObject } from '../storage/objectStore';

/** Veo makes 4, 6 or 8 s clips; the intro is read in about 4.5-5.5 s, so it fits 6 s (8 s when the read runs long). */
const VEO_SECONDS = [4, 6, 8] as const;
/** The voice starts after this, so the first frame is a smile, not a word. */
const VOICE_DELAY_S = 0.3;
/** Silence kept after the last word before the clip ends. */
const TAIL_S = 0.2;
/** An intro still "pending" after this was cut off (a killed function). */
export const INTRO_STALE_MS = 8 * 60_000;

const SYSTEM = `You write the 5-second intro video of a brand's recurring social media person: they say hello to the
brand's audience, as a friendly creator, not an ad. Simple words a 10-year-old can read.
- "script": 11-14 words (it must be read in under 5 seconds), 2-3 short sentences: "Hi, I'm <first name>!", then 1 or 2 things they will share on the feed
  (useful tips the audience wants, from the brand's world), then "See you on your feed!". The brand name at most once.
  No prices, no claims, no numbers.
- "voice": one voice from this list ONLY, the same gender as the person, fitting their age and energy:
  ${VOICE_CATALOG}
- "direction": one sentence of delivery notes: warm, friendly, natural, smiling, like talking to a friend.
Return JSON with flat keys only: {"script": string, "voice": string, "direction": string}`;

type Casting = { script: string; voice: string; direction: string };

const str = (v: unknown, max: number) => (typeof v === 'string' ? clip(v.replace(/\s+/g, ' ').trim(), max) : '');

/** "Woman" / "Man" from the member's look, so a bad voice answer falls back to the right gender. */
const lookGender = (look: string): 'female' | 'male' => (/\b(man|male|guy)\b/i.test(look) && !/\bwoman\b/i.test(look) ? 'male' : 'female');

const castIntro = async (member: BrandCastMember, profile: BrandProfile, meter: CostMeter): Promise<Casting> => {
  const user = `BRAND: ${profile.brandName}. SELLS: ${profile.valueProp}\nAUDIENCE: ${profile.audience}\nPERSON: ${member.name}. ${member.look}`;
  const raw = await creativeJson<Record<string, unknown>>(SYSTEM, user, meter, 'Cast intro');
  const gender = lookGender(member.look);
  const asked = str(raw.voice, 30);
  const voice = voiceGender(asked) === gender ? asked : defaultVoice(gender);
  const firstName = member.name.split(',')[0]!.trim();
  const script = str(raw.script, 160) || `Hi, I'm ${firstName}! I'll share easy tips you can use every day. See you on your feed!`;
  return { script, voice, direction: str(raw.direction, 200) || 'Warm, friendly and natural, smiling, like talking to a friend.' };
};

/** Veo's direction: a push-in to the face, a smile, a wave and a nod, the mouth closed (the voice is laid over it). */
const veoPrompt = (member: BrandCastMember): string => {
  const [they, their] = lookGender(member.look) === 'male' ? ['he', 'his'] : ['she', 'her'];
  return `Vertical 9:16 video made from this photo of ${member.name.split(',')[0]}. Over the whole clip the camera slowly and smoothly pushes in from the full body to a close-up of ${their} face. ${they[0]!.toUpperCase()}${they.slice(1)} looks into the camera, smiles warmly, gives a small friendly wave and a slight nod, blinking naturally. ${their[0]!.toUpperCase()}${their.slice(1)} mouth stays closed in a gentle smile: ${they} is not talking. Same person, same clothes, same plain bright background. Realistic, natural skin, soft even daylight, steady camera, no text.`;
};

/** The anchor photo as a 720x1280 first frame (Veo animates 9:16; the anchor is 3:4, so its sides are cropped). */
const firstFrame = async (anchorKey: string): Promise<Buffer> => {
  const anchor = await getObject(anchorKey);
  if (!anchor) throw new Error('The anchor photo is no longer in storage');
  return sharp(anchor).resize(720, 1280, { fit: 'cover', position: 'centre' }).jpeg({ quality: 92 }).toBuffer();
};

/** The clip with the voice on it: delayed a little, padded with silence to the clip's length. */
const mux = (video: Buffer, wav: Buffer, seconds: number): Promise<Buffer> =>
  withTempDir(async (dir) => {
    const [v, a, out] = ['clip.mp4', 'voice.wav', 'intro.mp4'].map((f) => path.join(dir, f)) as [string, string, string];
    await Promise.all([writeFile(v, video), writeFile(a, wav)]);
    const delayMs = Math.round(VOICE_DELAY_S * 1000);
    await ffmpeg(['-i', v, '-i', a, '-filter_complex', `[1:a]adelay=${delayMs}|${delayMs},apad[a]`, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-t', String(seconds), '-movflags', '+faststart', out]);
    return readFile(out);
  });

const introKey = (member: BrandCastMember) => `brand-cast/${member.workspaceId}/${member.id}-intro-${Date.now()}.mp4`;

/** Makes the intro and marks it ready (or failed). Never throws. Replaces the old video when there was one. */
const makeIntro = async (member: BrandCastMember, profile: BrandProfile, meter: CostMeter): Promise<void> => {
  try {
    if (!member.imageKey) throw new Error('This person has no photo yet');
    const casting = await castIntro(member, profile, meter);
    const [voice, frame] = await Promise.all([synthesize(casting.script, { voice: casting.voice, direction: casting.direction }, meter), firstFrame(member.imageKey)]);
    const seconds = VEO_SECONDS.find((s) => s >= voice.durationS + VOICE_DELAY_S + TAIL_S) ?? 8;
    const video = await makeClip('veo', { prompt: veoPrompt(member), seconds, frame, frameKey: member.imageKey, onSource: () => undefined }, meter);
    const key = introKey(member);
    await putObject(key, await mux(video, voice.wav, seconds), 'video/mp4');
    await prisma.brandCastMember.update({ where: { id: member.id }, data: { voice: casting.voice, introScript: casting.script, introVideoKey: key, introStatus: 'ready', introError: null } });
    if (member.introVideoKey) await deleteObject(member.introVideoKey).catch(() => undefined);
    console.log(`[brand-cast] intro for ${member.id} (${seconds} s, ${casting.voice}): $${meter.summary().usdMicros / 1e6}`);
  } catch (err) {
    const message = clip(err instanceof Error ? err.message : String(err), 300);
    console.warn(`[brand-cast] intro for ${member.id} failed:`, message);
    await prisma.brandCastMember.update({ where: { id: member.id }, data: { introStatus: 'failed', introError: message } }).catch(() => undefined);
  }
};

const isPending = (m: BrandCastMember) => m.introStatus === 'pending' && Date.now() - (m.introAt?.getTime() ?? 0) < INTRO_STALE_MS;

/** Marks the member's intro "pending" and returns the job that makes it (1-3 minutes). */
export const startIntro = async (workspaceId: string, memberId: string, meter: CostMeter = createMeter()): Promise<() => Promise<void>> => {
  const member = await prisma.brandCastMember.findFirst({ where: { id: memberId, workspaceId } });
  if (!member) throw new HttpError(404, 'not_found', 'This person is not in your cast.');
  if (member.status !== 'ready' || !member.imageKey) throw new HttpError(409, 'no_photo', 'Wait for this person\'s photo first.');
  if (isPending(member)) throw new HttpError(409, 'busy', 'This video is still being made.');
  const run = await prisma.autoSlideshowRun.findFirst({ where: { workspaceId, profile: { not: { equals: null } } }, orderBy: { createdAt: 'desc' }, select: { profile: true } });
  if (!run) throw new HttpError(409, 'no_brand', 'Add your website first. We read your brand from it.');
  const updated = await prisma.brandCastMember.update({ where: { id: member.id }, data: { introStatus: 'pending', introError: null, introAt: new Date() } });
  return () => makeIntro(updated, run.profile as unknown as BrandProfile, meter);
};
