/**
 * Asset descriptor smoke test v4
 *
 * Changes vs v3:
 *   - MEDIA_RESOLUTION_HIGH in generationConfig → ~264 tok/frame (4× vs default 66)
 *   - Loudness digit bug fixed: (lufs+40)/35 × 9, max-per-second, flat-curve guard
 *   - All scores (slot, niche, energyLevel) validated 0–1; out-of-range → repair call, no clamp
 *   - bpmEstimate rename (bpm column still the same DB column)
 *   - dropAt nullable in music schema + updated prompt rule
 *   - publicFigureLikely field + if true → rightsRisk='high'
 *   - effectiveRightsRisk() helper respects admin rightsRiskOverride
 *   - Exponential backoff with jitter for 429/503 (4 tries, 2 s base)
 *   - UGC talking-head added to test suite; transcript vs script comparison
 *
 * Run: npx tsx -r dotenv/config scripts/test-descriptor.ts dotenv_config_path=.env.local
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { GoogleGenAI, FileState, MediaModality, MediaResolution } from '@google/genai';

const execFileAsync = promisify(execFile);
const prisma = new PrismaClient();

// ── Config ────────────────────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const MODEL = process.env.GEMINI_DESCRIBE_MODEL ?? 'gemini-2.5-flash';
const FFPROBE = process.env.FFPROBE_PATH ?? 'ffprobe';
const FFMPEG  = process.env.FFMPEG_PATH  ?? 'ffmpeg';
const BUCKET  = process.env.R2_BUCKET_NAME ?? 'next5-photos';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
});

// Startup log
console.log(`\n🎬  Descriptor pipeline v4`);
console.log(`   Model: ${MODEL}  |  Resolution: HIGH (${MediaResolution.MEDIA_RESOLUTION_HIGH})`);
console.log(`   Key: ${GEMINI_API_KEY?.slice(0, 12)}…`);

// ── Test assets ───────────────────────────────────────────────────────────────

type AssetSource = 'scraped' | 'ai_generated' | 'uploaded';
type AssetKind   = 'background' | 'meme' | 'ugc_video' | 'music';

interface TestAsset {
  label: string;
  name: string;
  kind: AssetKind;
  source: AssetSource;
  sourceField: 'blitzAssetId' | 'ugcVideoId';
  id: string;
  r2Key: string;
  ext: string;
  mime: string;
  /** ugcVideo only — for transcript comparison */
  script?: string;
}

const TEST_ASSETS: TestAsset[] = [
  {
    label: 'Scraped video (BACKGROUND, no audio, 4s)',
    name: 'Video 1',
    kind: 'background',
    source: 'scraped',
    sourceField: 'blitzAssetId',
    id: '3835da79-2c64-4f5a-bd0b-c76d83f89117',
    r2Key: 'blitz/videos/25a45e47ed46457188cd904d7d538b3d.mp4',
    ext: 'mp4', mime: 'video/mp4',
  },
  {
    label: 'Meme (OVERLAY, has audio, 7s)',
    name: 'Meme 32',
    kind: 'meme',
    source: 'scraped',
    sourceField: 'blitzAssetId',
    id: '0600ef58-b089-4fd5-8d10-acd8e3a64c97',
    r2Key: 'blitz/assets/0a8f0c8be5044de3883b212e81843c2e.mp4',
    ext: 'mp4', mime: 'video/mp4',
  },
  {
    label: 'Music (cinderella.mp3, 43s)',
    name: 'cinderella',
    kind: 'music',
    source: 'uploaded',
    sourceField: 'blitzAssetId',
    id: '02e7399b-7d12-4470-acf3-5b85f33b6edc',
    r2Key: 'blitz/audio/cinderella.mp3',
    ext: 'mp3', mime: 'audio/mpeg',
  },
  {
    label: 'UGC talking-head (real-person, 8s)',
    name: 'UGC-cmu9791da',
    kind: 'ugc_video',
    source: 'ai_generated',
    sourceField: 'ugcVideoId',
    id: 'cmu9791da0002vus4ym5piwny',
    r2Key: 'ugc-lab/videos/cmu9791da0002vus4ym5piwny/raw.mp4',
    ext: 'mp4', mime: 'video/mp4',
    script: 'Lazy people do a little work and think they should be winning, but winners push harder and still worry.',
  },
];

// ── R2 ────────────────────────────────────────────────────────────────────────

async function downloadFromR2(key: string, dest: string): Promise<void> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!res.Body) throw new Error(`Empty R2 body: ${key}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const chunks: Uint8Array[] = [];
  for await (const c of res.Body as AsyncIterable<Uint8Array>) chunks.push(c);
  fs.writeFileSync(dest, Buffer.concat(chunks));
}

// ── ffprobe ───────────────────────────────────────────────────────────────────

interface ProbeResult {
  durationSec: number;
  hasVideo: boolean;
  hasAudio: boolean;
  fileSizeBytes: number;
}

async function probe(filePath: string): Promise<ProbeResult> {
  const { stdout } = await execFileAsync(FFPROBE, [
    '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', filePath,
  ]);
  const info = JSON.parse(stdout) as {
    format?: { duration?: string; size?: string };
    streams?: Array<{ codec_type?: string }>;
  };
  return {
    durationSec: parseFloat(info.format?.duration ?? '0'),
    hasVideo: !!info.streams?.find(s => s.codec_type === 'video'),
    hasAudio: !!info.streams?.find(s => s.codec_type === 'audio'),
    fileSizeBytes: parseInt(info.format?.size ?? '0', 10),
  };
}

// ── Loudness → 0–9 digit string ──────────────────────────────────────────────
//
// Unit test values (used in report):
//   [-40, -30, -14, -5] → digits [0, 3, 7, 9]
//
// mapping: level = clamp((lufs + 40) / 35, 0, 1)  → digit = round(level × 9)
//   -40 → 0/35=0 → 0
//   -30 → 10/35=0.286 → round(2.57)=3
//   -14 → 26/35=0.743 → round(6.69)=7
//    -5 → 35/35=1.0 → 9

function lufsToDigit(lufs: number): number {
  const level = Math.min(1, Math.max(0, (lufs + 40) / 35));
  return Math.round(level * 9);
}

async function measureLoudnessDigits(
  filePath: string, durationSec: number,
): Promise<{ digits: string; flat: boolean }> {
  try {
    const { stderr } = await execFileAsync(FFMPEG, [
      '-hide_banner', '-nostats',
      '-i', filePath,
      '-af', 'ebur128=framelog=verbose',
      '-f', 'null', '-',
    ], { maxBuffer: 8 * 1024 * 1024 });

    const re = /\] t:\s*([\d.]+)\s+TARGET[^\n]+M:\s*([-\d.]+)/g;
    const bySecond = new Map<number, number>(); // second → max LUFS
    let m: RegExpExecArray | null;
    while ((m = re.exec(stderr)) !== null) {
      const t = parseFloat(m[1]), lufs = parseFloat(m[2]);
      if (isNaN(t) || isNaN(lufs) || lufs < -80) continue;
      const sec = Math.floor(t);
      const prev = bySecond.get(sec);
      if (prev === undefined || lufs > prev) bySecond.set(sec, lufs);
    }

    const nSec = Math.ceil(durationSec);
    const digitArr: string[] = [];
    for (let s = 0; s < nSec; s++) {
      const lufs = bySecond.get(s);
      digitArr.push(lufs !== undefined ? String(lufsToDigit(lufs)) : '0');
    }

    const digits = digitArr.join(' ');
    const unique = new Set(digitArr);
    const flat = unique.size === 1;
    if (flat) console.log(`   ⚠  loudness curve is flat (all "${[...unique][0]}") — omitting from prompt`);
    return { digits, flat };
  } catch {
    return { digits: '', flat: true };
  }
}

// ── Scene cuts via ffmpeg scene= filter ───────────────────────────────────────

async function detectSceneCuts(filePath: string, durationSec: number): Promise<number[]> {
  try {
    const { stderr } = await execFileAsync(FFMPEG, [
      '-hide_banner', '-nostats',
      '-i', filePath,
      '-an',
      '-filter:v', "select='gt(scene,0.3)',showinfo",
      '-f', 'null', '-',
    ], { maxBuffer: 4 * 1024 * 1024 });
    const re = /pts_time:([\d.]+)/g;
    const cuts: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = re.exec(stderr)) !== null) {
      const t = parseFloat(match[1]);
      if (!isNaN(t) && t >= 0.2 && t <= durationSec - 0.2) cuts.push(+t.toFixed(2));
    }
    return cuts;
  } catch { return []; }
}

// ── Gemini file upload (> 18 MB) ─────────────────────────────────────────────

async function uploadViaFilesApi(
  filePath: string, mimeType: string, displayName: string,
): Promise<string> {
  const upload = await ai.files.upload({ file: filePath, config: { mimeType, displayName } });
  if (!upload.name) throw new Error('File upload: no name returned');
  let file = await ai.files.get({ name: upload.name });
  let attempts = 0;
  while (file.state === FileState.PROCESSING && attempts < 60) {
    await new Promise(r => setTimeout(r, 2000));
    file = await ai.files.get({ name: upload.name! });
    attempts++;
  }
  if (file.state !== FileState.ACTIVE) throw new Error(`File upload failed, state=${file.state}`);
  return `https://generativelanguage.googleapis.com/v1beta/${file.name}`;
}

// ── Usage helpers ─────────────────────────────────────────────────────────────

interface UsageSummary { text: number; image: number; audio: number; video: number; total: number; out: number; }

function parseUsage(u: {
  promptTokenCount?: number; candidatesTokenCount?: number;
  promptTokensDetails?: Array<{ modality?: string; tokenCount?: number }>;
} | undefined): UsageSummary {
  const d = u?.promptTokensDetails ?? [];
  const tok = (mod: string) => d.find(x => x.modality === mod)?.tokenCount ?? 0;
  return {
    text: tok(MediaModality.TEXT), image: tok(MediaModality.IMAGE),
    audio: tok(MediaModality.AUDIO), video: tok(MediaModality.VIDEO),
    total: u?.promptTokenCount ?? 0,
    out: u?.candidatesTokenCount ?? 0,
  };
}

// ── fps selection ─────────────────────────────────────────────────────────────

function videoFps(durationSec: number): number {
  if (durationSec <= 10) return 5;
  if (durationSec <= 20) return 3;
  return 2;
}

// ── effectiveRightsRisk helper ────────────────────────────────────────────────

function effectiveRightsRisk(
  modelRightsRisk: string,
  rightsRiskOverride: string | null | undefined,
): string {
  return rightsRiskOverride ?? modelRightsRisk;
}

// ── Prompts ───────────────────────────────────────────────────────────────────

function buildVideoPrompt(
  name: string, kind: string, source: string,
  durationSec: number, cuts: number[],
  loudnessDigits: string, loudnessFlat: boolean,
): string {
  const dur = durationSec.toFixed(2);
  const cutsStr = cuts.length > 0 ? cuts.map(t => `${t}s`).join(', ') : 'none';
  const loudnessLine = loudnessFlat
    ? '' // omit flat curve
    : `Loudness per second, 0 quiet to 9 loud: ${loudnessDigits}.\n`;

  return `You are casting short vertical clips for Next5, which builds 4-shot slideshows (2 to 5 s per shot) for realtors and TikTok Shop sellers.

Each shot plays one role:
- hook: stops the scroll in the first second. Direct eye contact, a bold look, surprise, an instantly relatable moment.
- problem: shows a pain, a frustration, a doubt or a bad outcome.
- proof: shows evidence, a result, a demonstration or credibility.
- payoff: the release. Relief, satisfaction, celebration or a punchline.
- cta: an invitation to act. Pointing, nodding, beckoning, speaking to camera.

You receive the clip "${name}" (kind: ${kind}, source: ${source}), ${dur} s, with its original audio.
Measured: scene cuts at ${cutsStr}. ${loudnessLine}
Describe it the way a social media editor would brief a colleague who cannot watch it. We need what the clip EXPRESSES and how it would be USED, not a list of objects.

Fill the JSON in this exact order. Write the descriptive fields first and score last.

{
  "subject": "who is on screen: apparent age range, look and style, presence",
  "action": "what they do and how the camera sees it: shot type, camera style, movement",
  "setting": "where it happens and what that signals",
  "emotion": {
    "face": "facial expression and how it changes",
    "voice": "vocal tone and delivery, including non-words. null if no voice",
    "arc": "how the feeling moves over the clip"
  },
  "vibe": ["3 to 5 words"],
  "meaning": "what the clip says as a shot, as the viewer's inner line or a caption idea",
  "bestUse": "one sentence: the role this clip plays best and why",
  "pairsWithHooks": ["3 to 6 example captions for realtors or TikTok Shop sellers"],
  "avoidFor": ["tones, topics or claims where this clip would feel wrong"],
  "timeline": [{ "start": 0.0, "end": 0.0, "what": "action and emotion in this segment", "peak": false }],
  "peakAt": 0.0,
  "bestTrim": { "start": 0.0, "end": 0.0 },
  "transcript": "verbatim speech, including fillers and non-words. null if none",
  "hasSpeech": false,
  "originalAudio": { "keep": false, "description": "string" },
  "pacing": "slow | medium | fast",
  "energyLevel": 0.0,
  "textSafeZone": "top_third | center | bottom_third | none",
  "identifiablePerson": false,
  "publicFigureLikely": false,
  "rightsRisk": "none | low | high",
  "slotScores": { "hook": 0.0, "problem": 0.0, "proof": 0.0, "payoff": 0.0, "cta": 0.0 },
  "nicheScores": { "realtor": 0.0, "tiktokShop": 0.0 },
  "retrievalText": "2 to 3 plain sentences combining subject, emotion, meaning and bestUse"
}

Rules:
1. All times are seconds within [0, ${dur}]. The timeline covers the whole clip with no gaps.
2. peakAt is the moment of strongest expression. bestTrim is the 2 to 5 s window around it.
3. Scores: first decide which role fits best, then score. The best role gets 0.6 to 0.95, a clearly wrong role gets below 0.2. Never give all five roles the same score.
4. All numeric scores (slotScores.*, nicheScores.*, energyLevel) are in [0, 1].
5. For meaning, bestUse and pairsWithHooks, think about how a realtor or a TikTok Shop seller would actually use this shot.
6. Describe only what you see and hear. Never name real people, brands or characters.
7. publicFigureLikely: true if the person appears to be a well-known public figure (actor, musician, athlete, influencer with a recognisable persona). Do not name them.
8. rightsRisk: "high" if it looks lifted from film, TV, a music video or shows a celebrity. Otherwise follow the source: ${source === 'scraped' ? 'this clip is scraped — use at least "low".' : '"none" is fine if clearly original.'}`;
}

function buildMusicPrompt(
  name: string, source: string,
  durationSec: number,
  loudnessDigits: string, loudnessFlat: boolean,
): string {
  const dur = durationSec.toFixed(2);
  const maxStart = Math.max(0, durationSec - 12).toFixed(2);
  const loudnessLine = loudnessFlat
    ? ''
    : `Loudness per second, 0 quiet to 9 loud: ${loudnessDigits}.\n`;

  return `You are choosing soundtracks for Next5, which builds 4-shot vertical slideshows of about 12 s for realtors and TikTok Shop sellers.

You receive the track "${name}" (source: ${source}), ${dur} s.
${loudnessLine}
Listen to the whole track and describe it so a colleague can match it to a slideshow without hearing it. Fill the JSON in this exact order. Write the descriptive fields first and score last.

{
  "sound": "instruments, texture and production style in plain words",
  "emotion": "what it makes a listener feel and how that changes over the track",
  "imagery": "what kind of scene this would score",
  "meaning": "the feeling it adds to a post, as a caption-style line",
  "vibe": ["3 to 5 words"],
  "sections": [{ "start": 0.0, "end": 0.0, "label": "intro | build | verse | chorus | drop | breakdown | outro", "energy": "low | medium | high" }],
  "dropAt": 0.0,
  "bestStart": 0.0,
  "fitsStructures": ["hook_to_reveal | steady_montage | comedic_sting | emotional_build | before_after"],
  "pairsWithHooks": ["3 to 6 example captions this track would carry well"],
  "avoidFor": ["tones or topics where it would feel wrong"],
  "hasVocals": false,
  "lyricsTheme": "what the lyrics are about in a few words. null if instrumental",
  "pacing": "slow | medium | fast",
  "energyLevel": 0.0,
  "bpmEstimate": 0,
  "rightsRisk": "none | low | high",
  "nicheScores": { "realtor": 0.0, "tiktokShop": 0.0 },
  "retrievalText": "2 to 3 plain sentences combining sound, emotion, imagery and meaning"
}

Rules:
1. All times are seconds within [0, ${dur}]. Sections cover the whole track with no gaps${!loudnessFlat ? '; use the loudness curve for boundaries' : ''}.
2. dropAt is the moment the track hits hardest (a drop, a beat entering, a big hit). Use null if the track has no such moment, for example steady ambient music. It is NOT where the track ends.
3. bestStart is where a 12 s slideshow should start so the strongest part lands on shot 3 or 4. Between 0 and ${maxStart}. If dropAt is null, bestStart is where the track is most representative.
4. fitsStructures: pick only the 1 or 2 that fit best.
5. All numeric scores (nicheScores.*, energyLevel) are in [0, 1].
6. Never name artists, songs or albums. rightsRisk: "high" if recognisable commercial track, "low" if sounds commercial but unclear, "none" only for generic library-style music. ${source === 'scraped' ? 'This track is scraped — use at least "low".' : ''}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface VideoDescriptor {
  subject: string; action: string; setting: string;
  emotion: { face: string; voice: string | null; arc: string };
  vibe: string[]; meaning: string; bestUse: string;
  pairsWithHooks: string[]; avoidFor: string[];
  timeline: Array<{ start: number; end: number; what: string; peak: boolean }>;
  peakAt: number;
  bestTrim: { start: number; end: number };
  transcript: string | null; hasSpeech: boolean;
  originalAudio: { keep: boolean; description: string };
  pacing: string; energyLevel: number; textSafeZone: string;
  identifiablePerson: boolean; publicFigureLikely: boolean; rightsRisk: string;
  slotScores: { hook: number; problem: number; proof: number; payoff: number; cta: number };
  nicheScores: { realtor: number; tiktokShop: number };
  retrievalText: string;
}

interface MusicDescriptor {
  sound: string; emotion: string; imagery: string; meaning: string; vibe: string[];
  sections: Array<{ start: number; end: number; label: string; energy: string }>;
  dropAt: number | null; bestStart: number;
  fitsStructures: string[]; pairsWithHooks: string[]; avoidFor: string[];
  hasVocals: boolean; lyricsTheme: string | null;
  pacing: string; energyLevel: number; bpmEstimate: number | null;
  rightsRisk: string;
  nicheScores: { realtor: number; tiktokShop: number };
  retrievalText: string;
}

// ── Validation ────────────────────────────────────────────────────────────────

const TOLERANCE = 0.2;

function inRange01(v: unknown, label: string, errs: string[]) {
  if (typeof v !== 'number' || v < 0 || v > 1) errs.push(`${label}=${v} out of [0, 1]`);
}

function validateVideo(d: VideoDescriptor, dur: number): string[] {
  const errs: string[] = [];
  const okT = (v: number, label: string) => {
    if (typeof v !== 'number' || v < -TOLERANCE || v > dur + TOLERANCE)
      errs.push(`${label}=${v} out of [0, ${dur.toFixed(2)}]`);
  };
  d.timeline?.forEach((seg, i) => { okT(seg.start, `timeline[${i}].start`); okT(seg.end, `timeline[${i}].end`); });
  okT(d.peakAt, 'peakAt');
  if (d.bestTrim) {
    okT(d.bestTrim.start, 'bestTrim.start');
    okT(d.bestTrim.end, 'bestTrim.end');
    const trimLen = (d.bestTrim.end ?? 0) - (d.bestTrim.start ?? 0);
    const minLen = Math.min(1.5, dur);
    if (trimLen < minLen - TOLERANCE) errs.push(`bestTrim too short: ${trimLen.toFixed(2)}s (min ${minLen}s)`);
    if (trimLen > 6 + TOLERANCE)      errs.push(`bestTrim too long: ${trimLen.toFixed(2)}s (max 6s)`);
    if (d.peakAt < (d.bestTrim.start ?? 0) - TOLERANCE || d.peakAt > (d.bestTrim.end ?? dur) + TOLERANCE)
      errs.push(`peakAt=${d.peakAt} not inside bestTrim [${d.bestTrim.start}, ${d.bestTrim.end}]`);
  }
  if (!['none','low','high'].includes(d.rightsRisk)) errs.push(`bad rightsRisk: ${d.rightsRisk}`);
  if (!['slow','medium','fast'].includes(d.pacing))  errs.push(`bad pacing: ${d.pacing}`);

  // Scores must be 0–1 (no clamping — fail and repair)
  inRange01(d.energyLevel, 'energyLevel', errs);
  for (const [k, v] of Object.entries(d.slotScores ?? {})) inRange01(v, `slotScores.${k}`, errs);
  for (const [k, v] of Object.entries(d.nicheScores ?? {})) inRange01(v, `nicheScores.${k}`, errs);

  // Flat slot scores
  const scores = Object.values(d.slotScores ?? {});
  if (scores.length === 5) {
    const spread = Math.max(...scores) - Math.min(...scores);
    if (spread < 0.3) errs.push(`slotScores flat (spread=${spread.toFixed(2)} < 0.3) — rank roles first`);
  }
  return errs;
}

function validateMusic(d: MusicDescriptor, dur: number, loudnessFlat: boolean): string[] {
  const errs: string[] = [];
  const okT = (v: number | null | undefined, label: string) => {
    if (v === null || v === undefined) return; // nullable is OK
    if (typeof v !== 'number' || v < -TOLERANCE || v > dur + TOLERANCE)
      errs.push(`${label}=${v} out of [0, ${dur.toFixed(2)}]`);
  };
  d.sections?.forEach((s, i) => { okT(s.start, `sections[${i}].start`); okT(s.end, `sections[${i}].end`); });
  okT(d.dropAt, 'dropAt');   // null is valid
  okT(d.bestStart, 'bestStart');
  if (!['none','low','high'].includes(d.rightsRisk)) errs.push(`bad rightsRisk: ${d.rightsRisk}`);

  // Scores must be 0–1
  inRange01(d.energyLevel, 'energyLevel', errs);
  for (const [k, v] of Object.entries(d.nicheScores ?? {})) inRange01(v, `nicheScores.${k}`, errs);

  // Require ≥ 2 sections for tracks > 20 s when loudness was sent
  if (dur > 20 && !loudnessFlat && (d.sections?.length ?? 0) < 2)
    errs.push(`only ${d.sections?.length ?? 0} section(s) for a ${dur.toFixed(0)}s track with loudness data — need ≥ 2`);

  return errs;
}

// ── Clamp timestamps only (not scores) ───────────────────────────────────────

const clampT = (v: number, max: number) => Math.min(Math.max(v ?? 0, 0), max);

function clampVideo(d: VideoDescriptor, dur: number): VideoDescriptor {
  return {
    ...d,
    peakAt: clampT(d.peakAt, dur),
    bestTrim: { start: clampT(d.bestTrim?.start ?? 0, dur), end: clampT(d.bestTrim?.end ?? dur, dur) },
    timeline: (d.timeline ?? []).map(s => ({ ...s, start: clampT(s.start, dur), end: clampT(s.end, dur) })),
  };
}

function clampMusic(d: MusicDescriptor, dur: number): MusicDescriptor {
  return {
    ...d,
    dropAt:    d.dropAt !== null ? clampT(d.dropAt ?? 0, dur) : null,
    bestStart: clampT(d.bestStart ?? 0, Math.max(0, dur - 12)),
    sections:  (d.sections ?? []).map(s => ({ ...s, start: clampT(s.start, dur), end: clampT(s.end, dur) })),
  };
}

// ── Rights enforcement ────────────────────────────────────────────────────────

function applyRightsRules(rightsRisk: string, source: string, publicFigureLikely?: boolean): string {
  if (publicFigureLikely) return 'high';
  if (source === 'scraped' && rightsRisk === 'none') return 'low';
  return rightsRisk;
}

// ── Gemini call with exponential backoff ─────────────────────────────────────

interface GeminiResult { text: string; usage: UsageSummary; wallMs: number; retries: number; }

async function callGemini(parts: Array<Record<string, unknown>>): Promise<GeminiResult> {
  const t0 = Date.now();
  let retries = 0;

  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      // Exponential backoff with jitter: 2^attempt seconds ± 50%
      const base = 2 ** attempt * 1000;
      const jitter = (Math.random() - 0.5) * base;
      const wait = Math.round(base + jitter);
      process.stdout.write(`   (retry ${attempt}, ${(wait/1000).toFixed(1)}s backoff) `);
      await new Promise(r => setTimeout(r, wait));
      retries++;
    }
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts: parts as never }],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.15,
          maxOutputTokens: 4000,
          mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
        },
      });
      const responseParts = response.candidates?.[0]?.content?.parts ?? [];
      const text = responseParts
        .filter((p: { thought?: boolean }) => !p.thought)
        .map((p: { text?: string }) => p.text ?? '')
        .join('');
      return { text, usage: parseUsage(response.usageMetadata as Parameters<typeof parseUsage>[0]), wallMs: Date.now() - t0, retries };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isRetryable = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
      if (!isRetryable || attempt === 3) throw e;
    }
  }
  throw new Error('unreachable');
}

// ── Repair call (text-only) ───────────────────────────────────────────────────

async function repairCall(originalPrompt: string, badJson: string, issues: string[]): Promise<GeminiResult> {
  const repairPrompt = `The JSON you returned has these validation issues:\n${issues.map(i => `- ${i}`).join('\n')}\n\nHere is what you returned:\n${badJson}\n\nRepeat the original task and fix the issues. Return ONLY valid JSON with the same schema.\n\n---\n${originalPrompt}`;
  return callGemini([{ text: repairPrompt }]);
}

// ── DB upsert ─────────────────────────────────────────────────────────────────

async function upsertRow(
  asset: TestAsset,
  data: Omit<Prisma.AssetDescriptorUncheckedUpdateInput, 'id' | 'blitzAssetId' | 'ugcVideoId'>,
): Promise<void> {
  const where = asset.sourceField === 'ugcVideoId' ? { ugcVideoId: asset.id } : { blitzAssetId: asset.id };
  const ex = await prisma.assetDescriptor.findFirst({ where });
  if (ex) {
    await prisma.assetDescriptor.update({ where: { id: ex.id }, data: { ...data, updatedAt: new Date() } });
  } else {
    await prisma.assetDescriptor.create({
      data: { id: `desc-smoke-${asset.id.slice(0,12)}`, ...where, ...(data as Prisma.AssetDescriptorUncheckedCreateInput) },
    });
  }
}

async function writeVideo(asset: TestAsset, d: VideoDescriptor, dur: number, cuts: number[], loudDigits: string): Promise<void> {
  await upsertRow(asset, {
    kind: asset.kind, source: asset.source, status: 'done', model: MODEL, descriptorVersion: 4,
    durationSec: dur,
    sceneCuts: cuts as unknown as Prisma.InputJsonValue,
    loudnessCurve: loudDigits as unknown as Prisma.InputJsonValue,
    descriptor: d as unknown as Prisma.InputJsonValue,
    retrievalText: d.retrievalText,
    mood: d.vibe, pacing: d.pacing, hasSpeech: d.hasSpeech,
    rightsRisk: d.rightsRisk, identifiablePerson: d.identifiablePerson,
    publicFigureLikely: d.publicFigureLikely,
    avoidFor: d.avoidFor, energyLevel: d.energyLevel, textSafeZone: d.textSafeZone,
    slotHook: d.slotScores.hook, slotProblem: d.slotScores.problem,
    slotProof: d.slotScores.proof, slotPayoff: d.slotScores.payoff, slotCta: d.slotScores.cta,
    nicheRealtor: d.nicheScores.realtor, nicheTiktokShop: d.nicheScores.tiktokShop,
  });
}

async function writeMusic(asset: TestAsset, d: MusicDescriptor, dur: number, loudDigits: string): Promise<void> {
  await upsertRow(asset, {
    kind: asset.kind, source: asset.source, status: 'done', model: MODEL, descriptorVersion: 4,
    durationSec: dur,
    loudnessCurve: loudDigits as unknown as Prisma.InputJsonValue,
    descriptor: d as unknown as Prisma.InputJsonValue,
    retrievalText: d.retrievalText,
    mood: d.vibe, pacing: d.pacing, hasSpeech: d.hasVocals,
    rightsRisk: d.rightsRisk, avoidFor: d.avoidFor,
    energyLevel: d.energyLevel, bpmEstimate: d.bpmEstimate,
    nicheRealtor: d.nicheScores.realtor, nicheTiktokShop: d.nicheScores.tiktokShop,
  });
}

// ── Per-asset runner ──────────────────────────────────────────────────────────

interface TestResult {
  label: string; success: boolean; error?: string;
  dur?: number; fileMb?: number; fps?: number;
  cuts?: number; loudDigits?: string; loudFlat?: boolean;
  usage?: UsageSummary; tokPerFrame?: number;
  costUsdEst?: number; wallSec?: number; retries?: number;
  validationFired?: string[]; repaired?: boolean; repairFixed?: boolean;
  descriptor?: VideoDescriptor | MusicDescriptor;
  rightsSetBy?: string;
}

async function runTest(asset: TestAsset): Promise<TestResult> {
  const tmpDir = path.join(os.tmpdir(), `desc4_${asset.id.slice(0,8)}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const srcPath = path.join(tmpDir, `source.${asset.ext}`);
  const wall0 = Date.now();

  console.log(`\n${'='.repeat(68)}`);
  console.log(`▶  ${asset.label}  [${asset.kind}] source=${asset.source}`);

  try {
    // 1. Download
    process.stdout.write('   [1] Download…   ');
    await downloadFromR2(asset.r2Key, srcPath);
    const fileMb = fs.statSync(srcPath).size / 1024 / 1024;
    console.log(`✓ ${fileMb.toFixed(2)} MB`);

    // 2. Probe
    process.stdout.write('   [2] Probe…       ');
    const p = await probe(srcPath);
    console.log(`✓ ${p.durationSec.toFixed(2)}s  hasVideo=${p.hasVideo}  hasAudio=${p.hasAudio}`);

    // 3. Measure
    process.stdout.write('   [3] Measure…     ');
    const [cuts, { digits: loudDigits, flat: loudFlat }] = await Promise.all([
      asset.kind !== 'music' && p.hasVideo
        ? detectSceneCuts(srcPath, p.durationSec)
        : Promise.resolve([] as number[]),
      measureLoudnessDigits(srcPath, p.durationSec),
    ]);
    const loudDisplay = loudFlat ? `(flat — omitted)` : `"${loudDigits.slice(0,30)}${loudDigits.length > 30 ? '…' : ''}"`;
    console.log(`✓ ${cuts.length} cuts  loudness=${loudDisplay}`);

    // 4. Build parts
    process.stdout.write('   [4] Prepare…     ');
    const INLINE_LIMIT = 18 * 1024 * 1024;
    let mediaPart: Record<string, unknown>;
    let fps: number | undefined;
    let prompt: string;

    if (asset.kind === 'music') {
      const b64 = fs.readFileSync(srcPath).toString('base64');
      mediaPart = { inlineData: { mimeType: asset.mime, data: b64 } };
      prompt = buildMusicPrompt(asset.name, asset.source, p.durationSec, loudDigits, loudFlat);
    } else {
      fps = videoFps(p.durationSec);
      if (p.fileSizeBytes < INLINE_LIMIT) {
        const b64 = fs.readFileSync(srcPath).toString('base64');
        mediaPart = { inlineData: { mimeType: asset.mime, data: b64 }, videoMetadata: { fps } };
      } else {
        console.log(`\n   (${fileMb.toFixed(1)} MB > 18 MB — Files API…)`);
        const uri = await uploadViaFilesApi(srcPath, asset.mime, asset.name);
        mediaPart = { fileData: { mimeType: asset.mime, fileUri: uri }, videoMetadata: { fps } };
      }
      prompt = buildVideoPrompt(asset.name, asset.kind, asset.source, p.durationSec, cuts, loudDigits, loudFlat);
    }

    const parts = [mediaPart, { text: prompt }];
    console.log(`✓ ${fileMb.toFixed(2)} MB${fps ? `  fps=${fps}` : ''}  prompt=${prompt.length} chars`);

    // 5. Call model
    process.stdout.write(`   [5] ${MODEL}… `);
    let { text, usage, wallMs, retries } = await callGemini(parts);
    const expectedFrames = fps ? Math.round(p.durationSec * fps) : undefined;
    const tokPerFrame = expectedFrames && usage.video > 0 ? Math.round(usage.video / expectedFrames) : undefined;
    console.log(`✓ ${wallMs}ms  in=${usage.total}(txt=${usage.text} vid=${usage.video} aud=${usage.audio}) out=${usage.out}${tokPerFrame ? `  ${tokPerFrame}tok/frame` : ''}${retries ? `  [${retries} retries]` : ''}`);

    // 6. Parse
    let descriptor: VideoDescriptor | MusicDescriptor;
    try { descriptor = JSON.parse(text) as VideoDescriptor | MusicDescriptor; }
    catch { throw new Error(`JSON parse failed. Raw: ${text.slice(0,400)}`); }

    // 7. Clamp timestamps, apply rights rules, then validate
    let validationErrs: string[];
    let rightsSetBy = 'model';

    if (asset.kind === 'music') {
      descriptor = clampMusic(descriptor as MusicDescriptor, p.durationSec);
      const d = descriptor as MusicDescriptor;
      const newRisk = applyRightsRules(d.rightsRisk, asset.source);
      if (newRisk !== d.rightsRisk) { d.rightsRisk = newRisk; rightsSetBy = 'source-floor'; }
      validationErrs = validateMusic(d, p.durationSec, !loudFlat);
    } else {
      descriptor = clampVideo(descriptor as VideoDescriptor, p.durationSec);
      const d = descriptor as VideoDescriptor;
      const newRisk = applyRightsRules(d.rightsRisk, asset.source, d.publicFigureLikely);
      if (newRisk !== d.rightsRisk) {
        rightsSetBy = d.publicFigureLikely ? 'publicFigureLikely=true' : 'source-floor';
        d.rightsRisk = newRisk;
      }
      validationErrs = validateVideo(d, p.durationSec);
    }

    // 8. Repair if needed
    let repaired = false, repairFixed = false;
    if (validationErrs.length > 0) {
      console.log(`   ⚠  Validation (${validationErrs.length}): ${validationErrs.join('; ')}`);
      console.log('   🔧 Repair call…');
      const repairResult = await repairCall(prompt, text, validationErrs);
      retries += repairResult.retries;
      repaired = true;
      try { descriptor = JSON.parse(repairResult.text) as VideoDescriptor | MusicDescriptor; }
      catch { /* keep original */ }

      if (asset.kind === 'music') {
        descriptor = clampMusic(descriptor as MusicDescriptor, p.durationSec);
        const d = descriptor as MusicDescriptor;
        const newRisk = applyRightsRules(d.rightsRisk, asset.source);
        if (newRisk !== d.rightsRisk) { d.rightsRisk = newRisk; rightsSetBy = 'source-floor'; }
        validationErrs = validateMusic(d, p.durationSec, !loudFlat);
      } else {
        descriptor = clampVideo(descriptor as VideoDescriptor, p.durationSec);
        const d = descriptor as VideoDescriptor;
        const newRisk = applyRightsRules(d.rightsRisk, asset.source, d.publicFigureLikely);
        if (newRisk !== d.rightsRisk) { rightsSetBy = d.publicFigureLikely ? 'publicFigureLikely=true' : 'source-floor'; d.rightsRisk = newRisk; }
        validationErrs = validateVideo(d, p.durationSec);
      }

      repairFixed = validationErrs.length === 0;
      if (!repairFixed) {
        console.log(`   ❌ Repair did not fix: ${validationErrs.join('; ')}`);
        await upsertRow(asset, { kind: asset.kind, source: asset.source, status: 'failed', model: MODEL, descriptorVersion: 4, error: validationErrs.join('; ') });
        return { label: asset.label, success: false, error: `Validation failed after repair: ${validationErrs.join('; ')}`, wallSec: (Date.now()-wall0)/1000 };
      }
    }

    console.log(`   ✓  Validation${repaired ? ` (repaired — fixed=${repairFixed})` : ''} passed`);

    // 9. Write DB
    if (asset.kind === 'music') {
      await writeMusic(asset, descriptor as MusicDescriptor, p.durationSec, loudDigits);
    } else {
      await writeVideo(asset, descriptor as VideoDescriptor, p.durationSec, cuts, loudDigits);
    }
    console.log('   ✅ Written');

    const wallSec = (Date.now()-wall0)/1000;
    console.log(`   ⏱  ${wallSec.toFixed(1)}s  retries=${retries}`);
    const costEst = (usage.total * 0.15 + usage.out * 0.60) / 1_000_000;

    return {
      label: asset.label, success: true,
      dur: p.durationSec, fileMb, fps,
      cuts: cuts.length, loudDigits, loudFlat,
      usage, tokPerFrame, costUsdEst: costEst,
      wallSec, retries, validationFired: [], repaired, repairFixed, descriptor, rightsSetBy,
    };
  } catch (err) {
    const wallSec = (Date.now()-wall0)/1000;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`   ❌ FAILED (${wallSec.toFixed(1)}s): ${msg.slice(0,200)}`);
    return { label: asset.label, success: false, error: msg, wallSec };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ── Loudness unit test ────────────────────────────────────────────────────────

function runLoudnessUnitTest() {
  const cases: [number, number][] = [[-40, 0], [-30, 3], [-14, 7], [-5, 9]];
  let ok = true;
  for (const [lufs, expected] of cases) {
    const got = lufsToDigit(lufs);
    if (got !== expected) { console.error(`  FAIL lufsToDigit(${lufs})=${got} expected ${expected}`); ok = false; }
  }
  if (ok) console.log('  ✓  lufsToDigit unit test: [-40,-30,-14,-5] → [0,3,7,9]');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!GEMINI_API_KEY) { console.error('❌  GEMINI_API_KEY not set'); process.exit(1); }

  console.log('\n── Loudness unit test ──────────────────────────────────');
  runLoudnessUnitTest();

  const results: TestResult[] = [];
  for (const asset of TEST_ASSETS) results.push(await runTest(asset));

  // ── Summary ──
  console.log(`\n${'='.repeat(68)}`);
  console.log('📊  SUMMARY  (v4 — HIGH resolution, fixed loudness)');
  console.log('='.repeat(68));

  let totalCost = 0, totalSec = 0;
  for (const r of results) {
    console.log(`\n${r.success ? '✅' : '❌'}  ${r.label}`);
    if (!r.success) { console.log(`    Error: ${r.error?.slice(0,200)}`); continue; }

    const d = r.descriptor!;
    const isMusic = 'sections' in d && !('slotScores' in d);

    console.log(`    File: ${r.fileMb?.toFixed(2)} MB${r.fps ? `  fps=${r.fps}` : ''}  Duration: ${r.dur?.toFixed(2)}s`);
    console.log(`    Tokens in: ${r.usage?.total} (txt=${r.usage?.text} vid=${r.usage?.video} aud=${r.usage?.audio})  out: ${r.usage?.out}${r.tokPerFrame ? `  → ${r.tokPerFrame} tok/frame` : ''}`);
    console.log(`    Cost est: ~$${r.costUsdEst?.toFixed(5)}  Wall: ${r.wallSec?.toFixed(1)}s  Retries: ${r.retries}`);
    if (r.repaired) console.log(`    Repair: ${r.repairFixed ? 'fixed validation' : 'STILL FAILING'}`);
    console.log(`    Loudness: ${r.loudFlat ? '(flat — omitted from prompt)' : r.loudDigits?.slice(0,60)}`);

    if (isMusic) {
      const m = d as MusicDescriptor;
      console.log(`\n    sound         : ${m.sound}`);
      console.log(`    emotion       : ${m.emotion}`);
      console.log(`    imagery       : ${m.imagery}`);
      console.log(`    meaning       : ${m.meaning}`);
      console.log(`    vibe          : ${m.vibe?.join(', ')}`);
      console.log(`    fitsStructures: ${m.fitsStructures?.join(', ')}`);
      console.log(`    sections      : ${m.sections?.map(s=>`${s.label}[${s.start}–${s.end}s,${s.energy}]`).join(', ')}`);
      console.log(`    dropAt        : ${m.dropAt ?? 'null'}  bestStart: ${m.bestStart}s  bpmEstimate: ${m.bpmEstimate ?? 'null'}`);
      console.log(`    rightsRisk    : ${m.rightsRisk}  (set by: ${r.rightsSetBy})`);
      console.log(`    niche         : realtor=${m.nicheScores?.realtor?.toFixed(2)}  tiktokShop=${m.nicheScores?.tiktokShop?.toFixed(2)}`);
      console.log(`    retrievalText : "${m.retrievalText?.slice(0,120)}"`);
    } else {
      const v = d as VideoDescriptor;
      console.log(`\n    subject       : ${v.subject}`);
      console.log(`    action        : ${v.action}`);
      console.log(`    setting       : ${v.setting}`);
      console.log(`    emotion.face  : ${v.emotion?.face}`);
      console.log(`    emotion.voice : ${v.emotion?.voice ?? 'null'}`);
      console.log(`    emotion.arc   : ${v.emotion?.arc}`);
      console.log(`    meaning       : ${v.meaning}`);
      console.log(`    bestUse       : ${v.bestUse}`);
      console.log(`    vibe          : ${v.vibe?.join(', ')}`);
      console.log(`    peakAt        : ${v.peakAt}s  bestTrim: [${v.bestTrim?.start}–${v.bestTrim?.end}s]`);
      console.log(`    slotScores    : hook=${v.slotScores?.hook?.toFixed(2)} prob=${v.slotScores?.problem?.toFixed(2)} proof=${v.slotScores?.proof?.toFixed(2)} payoff=${v.slotScores?.payoff?.toFixed(2)} cta=${v.slotScores?.cta?.toFixed(2)}`);
      console.log(`    niche         : realtor=${v.nicheScores?.realtor?.toFixed(2)}  tiktokShop=${v.nicheScores?.tiktokShop?.toFixed(2)}`);
      console.log(`    hasSpeech     : ${v.hasSpeech}  transcript: "${v.transcript ?? ''}"`);
      console.log(`    rightsRisk    : ${v.rightsRisk}  identifiable: ${v.identifiablePerson}  publicFigure: ${v.publicFigureLikely}  (set by: ${r.rightsSetBy})`);
      console.log(`    textSafeZone  : ${v.textSafeZone}  pacing: ${v.pacing}  energy: ${v.energyLevel}`);
      console.log(`    avoidFor      : ${v.avoidFor?.join(', ') || 'none'}`);
      console.log(`    retrievalText : "${v.retrievalText?.slice(0,120)}"`);

      // UGC audio check
      const testAsset = TEST_ASSETS.find(a => a.id === results.indexOf(r) >= 0 && a.label === r.label);
      const matchedAsset = TEST_ASSETS.find(a => a.label === r.label);
      if (matchedAsset?.script) {
        console.log(`\n    ── Audio/transcript check ───────────────────────────`);
        console.log(`    Script    : "${matchedAsset.script}"`);
        console.log(`    Transcript: "${v.transcript ?? '(empty)'}"`);
        const scriptWords = matchedAsset.script.toLowerCase().split(/\s+/);
        const transcriptWords = (v.transcript ?? '').toLowerCase().split(/\s+/).filter(Boolean);
        const overlap = scriptWords.filter(w => transcriptWords.includes(w)).length;
        const pct = scriptWords.length > 0 ? Math.round(overlap / scriptWords.length * 100) : 0;
        console.log(`    Word match: ${overlap}/${scriptWords.length} (${pct}%)`);
        if (!v.transcript || v.transcript.trim() === '') {
          console.log(`    ⚠  TRANSCRIPT EMPTY — audio track not reaching model`);
        } else if (pct < 50) {
          console.log(`    ⚠  LOW MATCH (${pct}%) — possible audio issue or heavily paraphrased`);
        } else {
          console.log(`    ✓  Match OK`);
        }
      }
    }

    totalCost += r.costUsdEst ?? 0;
    totalSec  += r.wallSec ?? 0;
  }

  console.log(`\n${'─'.repeat(68)}`);
  console.log(`Total cost est  : ~$${totalCost.toFixed(5)}`);
  console.log(`Total wall time : ${totalSec.toFixed(1)}s\n`);

  await prisma.$disconnect();
}

main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
