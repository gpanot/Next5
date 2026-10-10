// server-only — never import from a 'use client' file.
// A Brand Cast member's intro video (6 s): "Hi, I'm Maya! … See you on your feed!". One small call writes the line; the
// voice is described from the member's age and gender; Veo 3.1 Lite (treg) then makes the whole clip from the anchor photo as its first frame: a slow
// push-in to the face, a wave, and the person really speaking the line with Veo's own voice and lip sync. Picked by the
// user on 2026-10-10 over Seedance 2.0 (with and without our Gemini voice) and over a silent clip with a voiceover.

import sharp from 'sharp';
import type { BrandCastMember } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { BrandProfile } from '../../types/admin/companyIntel';
import { HttpError } from '../http';
import { createMeter, type CostMeter } from '../metaAds/cost';
import { clip } from '../metaAds/text';
import { creativeJson } from '../shorts/llm';
import { tregBytes, tregJson, withRetry } from '../shorts/treg';
import { deleteObject, getObject, putObject } from '../storage/objectStore';

/** 6 s fits the 11-14 word line; Veo makes 4, 6 or 8 s clips. */
const SECONDS = 6;
/** Veo 3.1 Lite at 720p with audio: $0.05 a second (treg rate card), used when treg does not report the charge. */
const USD_PER_SECOND = 0.05;
const POLL_MS = 10_000;
/** Veo answers in about a minute; on Vercel the whole intro must end before the 300 s limit. */
const DEADLINE_MS = process.env.VERCEL === '1' ? 250_000 : 6 * 60_000;
const FAILED = new Set(['failed', 'cancelled', 'expired', 'error']);
/** An intro still "pending" after this was cut off (a killed function). */
export const INTRO_STALE_MS = 8 * 60_000;

const SYSTEM = `You write the 5-second intro video of a brand's recurring social media person: they say hello to the
brand's audience, as a friendly creator, not an ad. Simple words a 10-year-old can read.
- "script": 11-14 words (it must be said in under 5 seconds), 2-3 short sentences: "Hi, I'm <first name>!", then 1 or 2
  things they will share on the feed (useful tips the audience wants, from the brand's world), then "See you on your
  feed!". The brand name at most once. No prices, no claims, no numbers.
Return JSON with flat keys only: {"script": string}`;

type Casting = { script: string; voice: string };
type Task = { id?: string; status?: string; error?: unknown; usage?: { cost?: number } };

const str = (v: unknown, max: number) => (typeof v === 'string' ? clip(v.replace(/\s+/g, ' ').trim(), max) : '');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const firstName = (m: BrandCastMember) => m.name.split(',')[0]!.trim();

/** "Woman" / "Man" from the member's look. */
const isMan = (look: string) => /\b(man|male|guy)\b/i.test(look) && !/\bwoman\b/i.test(look);

/** The voice as the best test clip asked for it (2026-10-10): "warm, friendly American young woman in her early twenties". */
const voiceOf = (member: BrandCastMember): string => {
  const age = Number(member.name.split(',')[1]?.trim()) || 25;
  const decade = ['twenties', 'thirties', 'forties', 'fifties', 'sixties'][Math.min(4, Math.max(0, Math.floor(age / 10) - 2))];
  const part = age % 10 < 4 ? 'early' : age % 10 < 7 ? 'mid' : 'late';
  const [who, their] = isMan(member.look) ? ['man', 'his'] : ['woman', 'her'];
  return `warm, friendly American ${age < 30 ? `young ${who}` : who} in ${their} ${part} ${decade}`;
};

const castIntro = async (member: BrandCastMember, profile: BrandProfile, meter: CostMeter): Promise<Casting> => {
  const user = `BRAND: ${profile.brandName}. SELLS: ${profile.valueProp}\nAUDIENCE: ${profile.audience}\nPERSON: ${member.name}. ${member.look}`;
  const raw = await creativeJson<Record<string, unknown>>(SYSTEM, user, meter, 'Cast intro');
  const script = str(raw.script, 160) || `Hi, I'm ${firstName(member)}! I'll share easy tips you can use every day. See you on your feed!`;
  return { script, voice: voiceOf(member) };
};

/** The prompt of the best test clip (lip_veo_Jordan, 2026-10-10), word for word, with a stronger "no music": Veo makes
 *  all the audio, so the prompt is the only way to keep music out. */
const veoPrompt = (member: BrandCastMember, casting: Casting): string => {
  const name = firstName(member);
  return `Vertical 9:16 selfie-style intro video starting exactly from this photo of ${name}. Over the whole clip the camera slowly pushes in from the full body to a close-up of the face. ${name} looks into the camera, smiles, gives a small wave at the start and speaks naturally with clear lip movement, in a ${casting.voice} voice: "${casting.script}" Same person, same clothes, same plain bright background. Realistic, soft daylight. Audio: only ${name}'s voice, no background music, no sound effects. No text, no subtitles.`;
};

/** The anchor photo as a 720x1280 first frame (Veo animates 9:16; the anchor is 3:4, so its sides are cropped). */
const firstFrame = async (anchorKey: string): Promise<Buffer> => {
  const anchor = await getObject(anchorKey);
  if (!anchor) throw new Error('The anchor photo is no longer in storage');
  return sharp(anchor).resize(720, 1280, { fit: 'cover', position: 'centre' }).jpeg({ quality: 92 }).toBuffer();
};

/** Veo 3.1 Lite with its own audio (speech and lip sync), from the first frame. Returns the mp4. */
const veoTalk = async (prompt: string, frame: Buffer, meter: CostMeter): Promise<Buffer> => {
  const frameImages = [{ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${frame.toString('base64')}` }, frame_type: 'first_frame' }];
  const body = { model: 'google/veo-3.1-lite', prompt, duration: SECONDS, resolution: '720p', aspect_ratio: '9:16', generate_audio: true, frame_images: frameImages };
  const { data } = await withRetry(() => tregJson<Task>('openrouter.x.google-veo-3-1-lite', { body, timeoutMs: 90_000 }));
  const id = data.id;
  if (!id) throw new Error('Veo returned no task id');
  const until = Date.now() + DEADLINE_MS;
  while (Date.now() < until) {
    await sleep(POLL_MS);
    const task = await tregJson<Task>('openrouter.video-gen.task.status', { query: { id }, timeoutMs: 20_000 }).then((r) => r.data).catch(() => null);
    const status = (task?.status ?? '').toLowerCase();
    if (task && FAILED.has(status)) throw new Error(`Veo failed: ${JSON.stringify(task.error ?? status).slice(0, 300)}`);
    if (task && status === 'completed') {
      meter.add('Intro video · Veo 3.1 Lite with audio (treg)', Math.round((task.usage?.cost ?? SECONDS * USD_PER_SECOND) * 1e6));
      return withRetry(() => tregBytes('openrouter.video-gen.result.retrieve', { query: { id }, timeoutMs: 120_000 }));
    }
  }
  throw new Error(`Veo timed out after ${Math.round(DEADLINE_MS / 1000)} s`);
};

const introKey = (member: BrandCastMember) => `brand-cast/${member.workspaceId}/${member.id}-intro-${Date.now()}.mp4`;

/** Makes the intro and marks it ready (or failed). Never throws. Replaces the old video when there was one. */
const makeIntro = async (member: BrandCastMember, profile: BrandProfile, meter: CostMeter): Promise<void> => {
  try {
    if (!member.imageKey) throw new Error('This person has no photo yet');
    const [casting, frame] = await Promise.all([castIntro(member, profile, meter), firstFrame(member.imageKey)]);
    const video = await veoTalk(veoPrompt(member, casting), frame, meter);
    const key = introKey(member);
    await putObject(key, video, 'video/mp4');
    await prisma.brandCastMember.update({ where: { id: member.id }, data: { voice: casting.voice, introScript: casting.script, introVideoKey: key, introStatus: 'ready', introError: null } });
    if (member.introVideoKey) await deleteObject(member.introVideoKey).catch(() => undefined);
    console.log(`[brand-cast] intro for ${member.id}: $${meter.summary().usdMicros / 1e6}`);
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
