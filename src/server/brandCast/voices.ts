// server-only — never import from a 'use client' file.
// "Change voice" on a Brand Cast avatar (2026-10-17): like the Shorts voice step, a planner picks 6 Gemini prebuilt
// voices of the person's gender for this person and brand, and each one reads the person's hello as a sample. The pick is
// stored on the member (tts_voice) for later narration (Blitz cards, not yet). The intro video is not made again: Veo
// speaks it with its own voice. Candidates and samples are made once per member, then served from the row.
// When the intro video is ready, its own audio is kept as a reference and the Gemini voice closest to it comes first
// (Recommended); see introVoice.ts. An intro made after the voices makes them again on the next open.

import type { BrandCastMember } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { AvatarVoicesDto } from '../../types/admin/brandCast';
import type { BrandProfile } from '../../types/admin/companyIntel';
import type { VoiceGender } from '../../types/admin/shorts';
import { HttpError } from '../http';
import { createMeter, type CostMeter } from '../metaAds/cost';
import { creativeJson } from '../shorts/llm';
import { sampleLine } from '../shorts/voice';
import { GEMINI_VOICES } from '../shorts/voices';
import { presignObject, putObject } from '../storage/objectStore';
import { isMan } from './intro';
import { closestVoice, extractIntroVoice } from './introVoice';

const OPTIONS = 6;
/** Used when the planner returns too few valid voices (Blitz's two narrators first). */
const DEFAULTS: Record<VoiceGender, string[]> = {
  female: ['Sulafat', 'Kore', 'Laomedeia', 'Aoede', 'Achernar', 'Leda'],
  male: ['Achird', 'Puck', 'Charon', 'Umbriel', 'Algieba', 'Sadachbia'],
};

type StoredOption = { name: string; style: string; why: string; sampleKey?: string };
/** The voice_options column. `introKey`: the intro video's audio. `picked`: the owner tapped "Use" (else tts_voice is
 *  the Recommended default and follows a new Recommended). The first rows (2026-10-17) were a bare array. */
type StoredVoices = { options: StoredOption[]; introKey?: string; picked?: boolean };

const genderOf = (m: BrandCastMember): VoiceGender => (isMan(m.look) ? 'male' : 'female');
const firstName = (m: BrandCastMember) => m.name.split(',')[0]!.trim();

const voicesOf = (gender: VoiceGender) => Object.entries(GEMINI_VOICES).filter(([, v]) => v.gender === gender);

const SYSTEM = (gender: VoiceGender) => `You cast the voice of a brand's recurring social media person: they talk to the
brand's followers like a friendly creator, in short narrated slideshows. Pick ${OPTIONS} ${gender} voices from this list
ONLY, best fit first, all different:
${voicesOf(gender).map(([name, v]) => `${name} (${v.style})`).join(', ')}

Fit the voice to the person's age and look, the brand and who it talks to. Mix a few styles so the owner can compare.
Return JSON with exactly these flat keys:
{${Array.from({ length: OPTIONS }, (_, i) => `"voice_${i + 1}": string, "voice_${i + 1}_why": string`).join(', ')}}
Each name is exactly as listed; each why is under 12 words, simple words.`;

/** Up to 6 valid, distinct voices of the gender: `first` (the intro's closest), the planner's answer, then the defaults. */
const castVoices = (raw: Record<string, string | undefined>, gender: VoiceGender, first: { name: string; why: string } | null): StoredOption[] => {
  const picked: StoredOption[] = [];
  const add = (name: string | undefined, why: string) => {
    const clean = name?.trim() ?? '';
    const voice = GEMINI_VOICES[clean];
    if (!voice || voice.gender !== gender || picked.some((p) => p.name === clean) || picked.length >= OPTIONS) return;
    picked.push({ name: clean, style: voice.style, why });
  };
  if (first) add(first.name, first.why ? `Closest to your intro video: ${first.why}` : 'Closest to your intro video.');
  for (let i = 1; i <= OPTIONS; i++) add(raw[`voice_${i}`], raw[`voice_${i}_why`]?.trim() || '');
  for (const name of DEFAULTS[gender]) add(name, '');
  return picked;
};

const latestProfile = async (workspaceId: string): Promise<BrandProfile | null> => {
  const run = await prisma.autoSlideshowRun.findFirst({ where: { workspaceId, profile: { not: { equals: null } } }, orderBy: { createdAt: 'desc' }, select: { profile: true } });
  return run ? (run.profile as unknown as BrandProfile) : null;
};

/** What every sample reads: the intro's line when there is one, else a hello in the same shape. */
const sampleText = (m: BrandCastMember) => m.introScript || `Hi, I'm ${firstName(m)}! I'll share easy tips you can use every day. See you on your feed!`;

const direction = (m: BrandCastMember, gender: VoiceGender) =>
  `A friendly ${gender === 'male' ? 'man' : 'woman'} (${m.name.split(',')[1]?.trim() || 'about 25'}) talking to followers like a friend: warm, natural, clear, never salesy.`;

/** The intro's audio (when ready) and its closest Gemini voice, alongside the planner. */
const planVoices = async (m: BrandCastMember, gender: VoiceGender, meter: CostMeter) => {
  const profile = await latestProfile(m.workspaceId);
  const user = `PERSON: ${m.name}. ${m.look}\nBRAND: ${profile?.brandName ?? 'unknown'}. SELLS: ${profile?.valueProp ?? ''}\nAUDIENCE: ${profile?.audience ?? ''}`;
  const intro = extractIntroVoice(m);
  const [raw, introAudio, closest] = await Promise.all([
    creativeJson<Record<string, string | undefined>>(SYSTEM(gender), user, meter, 'Avatar voice casting').catch(() => ({})),
    intro,
    intro.then((a) => (a ? closestVoice(a.wav, gender).catch(() => null) : null)),
  ]);
  return { options: castVoices(raw, gender, closest), introKey: introAudio?.key };
};

/** Plans the candidates and records each sample. A failed sample leaves that option without one. */
const makeVoices = async (m: BrandCastMember, meter: CostMeter): Promise<StoredVoices> => {
  const gender = genderOf(m);
  const { options, introKey } = await planVoices(m, gender, meter);
  const text = sampleText(m);
  const choice = { direction: direction(m, gender) };
  const sampled = await Promise.all(
    options.map(async (o) => {
      try {
        const key = `brand-cast/${m.workspaceId}/${m.id}-voice-${o.name}-${Date.now()}.wav`;
        await putObject(key, await sampleLine(text, { ...choice, voice: o.name }, meter), 'audio/wav');
        return { ...o, sampleKey: key };
      } catch (err) {
        console.warn(`[brand-cast] voice sample ${o.name} failed:`, err instanceof Error ? err.message.slice(0, 120) : err);
        return o;
      }
    }),
  );
  return { options: sampled, ...(introKey ? { introKey } : {}) };
};

const activeMember = async (workspaceId: string, memberId: string): Promise<BrandCastMember> => {
  const m = await prisma.brandCastMember.findFirst({ where: { id: memberId, workspaceId, archivedAt: null } });
  if (!m) throw new HttpError(404, 'not_found', 'This person is not in your cast.');
  if (m.status !== 'ready') throw new HttpError(409, 'no_photo', 'Wait for this person\'s photo first.');
  return m;
};

const readStored = (m: BrandCastMember): StoredVoices | null => {
  const raw = m.voiceOptions as unknown;
  if (Array.isArray(raw)) return { options: raw as StoredOption[] };
  return raw && typeof raw === 'object' && Array.isArray((raw as StoredVoices).options) ? (raw as StoredVoices) : null;
};

/** Stored voices still fit: they have samples, and an intro made since is in them. */
const isFresh = (m: BrandCastMember, stored: StoredVoices | null): boolean =>
  Boolean(stored?.options.some((o) => o.sampleKey)) && (m.introStatus !== 'ready' || Boolean(stored?.introKey));

/** The planner's best fit that has a sample: the default voice. */
const recommendedOf = (options: StoredOption[]) => options.find((o) => o.sampleKey)?.name ?? null;

const sign = (key: string | undefined) => (key ? presignObject(key).catch(() => null) : Promise.resolve(null));

const toDto = async (voice: string | null, stored: StoredVoices): Promise<AvatarVoicesDto> => ({
  voice,
  recommended: recommendedOf(stored.options),
  introSampleUrl: await sign(stored.introKey),
  options: await Promise.all(stored.options.map(async (o) => ({ name: o.name, style: o.style, why: o.why, sampleUrl: await sign(o.sampleKey) }))),
});

/** The member's voice candidates with samples (~15 s to make the first time, about $0.015), and the voice in use. */
export const avatarVoices = async (workspaceId: string, memberId: string): Promise<AvatarVoicesDto> => {
  const m = await activeMember(workspaceId, memberId);
  const stored = readStored(m);
  if (stored && isFresh(m, stored)) return toDto(m.ttsVoice ?? recommendedOf(stored.options), stored);
  const meter = createMeter();
  const made = await makeVoices(m, meter);
  if (!made.options.some((o) => o.sampleKey)) throw new HttpError(503, 'voice_busy', 'The voices are busy right now. Try again in a moment.');
  // Until the owner picks one, the recommended voice is the avatar's voice.
  const picked = Boolean(stored?.picked) && made.options.some((o) => o.name === m.ttsVoice);
  const voice = picked ? m.ttsVoice : recommendedOf(made.options);
  const next: StoredVoices = { ...made, picked };
  await prisma.brandCastMember.update({ where: { id: m.id }, data: { voiceOptions: next, ttsVoice: voice } });
  console.log(`[brand-cast] voices for ${m.id}: $${meter.summary().usdMicros / 1e6}`);
  return toDto(voice, next);
};

/** Attaches one of the candidates to the member. */
export const pickAvatarVoice = async (workspaceId: string, memberId: string, voice: unknown): Promise<AvatarVoicesDto> => {
  const m = await activeMember(workspaceId, memberId);
  const stored = readStored(m) ?? { options: [] };
  if (typeof voice !== 'string' || !stored.options.some((o) => o.name === voice)) throw new HttpError(400, 'bad_voice', 'Pick one of the voices shown.');
  const next: StoredVoices = { ...stored, picked: true };
  await prisma.brandCastMember.update({ where: { id: m.id }, data: { ttsVoice: voice, voiceOptions: next } });
  return toDto(voice, next);
};
