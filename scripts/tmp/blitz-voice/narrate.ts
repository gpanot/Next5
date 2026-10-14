// Test (2026-10-12): a Blitz card narrated like an explainer instead of music.
// Step A: loads a scheduled Blitz post's render body, writes one spoken line per slide, casts a Gemini voice
// (Shorts step 2: planVoices + Jev pickVoice) and records each line (Shorts synthesize). Each slide then lasts as long
// as its line. Writes out/<postId>/plan.json + voice.wav for render.ts (run from blitz-worker).
// Run: npx tsx --env-file=.env.local scripts/tmp/blitz-voice/narrate.ts <scheduledPostId>

import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { prisma } from '../../../src/lib/db';
import { createMeter } from '../../../src/server/metaAds/cost';
import { creativeJson } from '../../../src/server/shorts/llm';
import { synthesize } from '../../../src/server/shorts/voice';
import { pickVoice, planVoices } from '../../../src/server/shorts/voices';
import { pcmSeconds, pcmToWav, SAMPLE_RATE, wavToPcm } from '../../../src/server/shorts/ffmpeg';
import { withSlideCameras } from '../../../src/server/labs/blitzCamera';
import type { RenderBody } from '../../../src/server/labs/blitzRender';
import type { ShortInputs, ShortScript } from '../../../src/types/admin/shorts';

type Slide = { text: string; backgroundKey?: string; durationSec?: number; trimStart?: number; positionY?: number };

/** Breath after each slide's line before the next slide's line starts. */
const SLIDE_GAP_S = 0.35;
const MIN_SLIDE_S = 1.6;
const MAX_SLIDE_S = 10;

const SYSTEM = `You write the voiceover of a short vertical video (TikTok / Reels). The video is a series of slides, each
with a short caption on screen. A narrator explains the story out loud, like a friendly explainer video, so the viewer
keeps watching. Write ONE spoken line per slide, in order.
Rules:
- Line 1 says the hook so it lands in the first 2 seconds, then opens a loop that makes them stay
  ("...and most shops get this wrong.", "Here's why."). Max 14 words.
- Middle lines EXPLAIN, never read the caption back: the viewer already sees it. Each adds one thing the screen does
  not say: the why, a quick picture of the moment, what it costs, or how it works. 10-18 words each.
- Each line hands off to the next slide so the story pulls forward ("And that's the problem.", "Here's the fix.").
- Plain 3rd-grade words, contractions, one idea per line, talk to "you", like a friend explaining over coffee.
- Last line says the call to action of the last slide, warm and short (max 8 words).
- Keep every fact and number exactly as on screen. Never invent results, prices, features or claims.
- No emojis, no hashtags, no stage directions, no brackets.
Return JSON with flat keys: {"line_1": string, "line_2": string, ...} one key per slide.`;

const userPrompt = (brand: string, about: string, slides: Slide[]) =>
  `BRAND: ${brand}\nWHAT IT IS: ${about}\nSLIDES:\n${slides.map((s, i) => `${i + 1}. ${s.text}`).join('\n')}`;

const silence = (seconds: number): Buffer => Buffer.alloc(Math.round(seconds * SAMPLE_RATE) * 2);

const main = async () => {
  const postId = process.argv[2];
  if (!postId) throw new Error('usage: narrate.ts <scheduledPostId>');
  const post = await prisma.blitzScheduledPost.findUniqueOrThrow({ where: { id: postId } });
  const ws = await prisma.workspace.findUniqueOrThrow({ where: { id: post.workspaceId } });
  const body = post.renderBody as unknown as RenderBody;
  const slides = (body.slides ?? []).map((s) => (typeof s === 'string' ? { text: s } : s)) as Slide[];
  const meter = createMeter();

  const raw = await creativeJson<Record<string, string>>(SYSTEM, userPrompt(ws.name, ws.promoting ?? ws.offer ?? '', slides), meter, 'Blitz voiceover');
  const lines = slides.map((s, i) => raw[`line_${i + 1}`]?.trim() || s.text);
  lines.forEach((l, i) => console.log(`  ${i + 1}. [${slides[i].text}]\n     → ${l}`));

  const narration = lines.join(' ');
  const inputs = { brandName: ws.name, domain: ws.websiteUrl ?? '', audience: ws.audienceType ?? ws.industry ?? 'small business owners', tone: 'friendly, clear' } as ShortInputs;
  const script = { hook: lines[0], mechanismLines: lines.slice(1, -1), payoffLine: lines[lines.length - 1], narration } as ShortScript;
  const { direction, options } = await planVoices(inputs, script, meter);
  const voice = process.argv[3] ?? (await pickVoice(options, inputs, script, direction)).voice;
  console.log(`voice ${voice} — ${direction}`);

  // One recording per slide, so each slide's length follows its own line.
  const takes = await Promise.all(lines.map((l) => synthesize(l, { voice, direction }, meter)));
  const pcms: Buffer[] = [];
  const timed = takes.map((t, i) => {
    const pcm = wavToPcm(t.wav);
    const seconds = Math.min(MAX_SLIDE_S, Math.max(MIN_SLIDE_S, pcmSeconds(pcm) + SLIDE_GAP_S));
    pcms.push(Buffer.concat([pcm, silence(seconds - pcmSeconds(pcm))]));
    return { ...slides[i], durationSec: Math.round(seconds * 100) / 100, spoken: lines[i] };
  });
  const total = timed.reduce((sum, s) => sum + s.durationSec, 0);
  const withCameras = await withSlideCameras(timed, body.textConfigOverride?.positionY ?? 0.5);

  const dir = path.join(__dirname, 'out', postId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'voice.wav'), pcmToWav(Buffer.concat(pcms)));
  await writeFile(path.join(dir, 'plan.json'), JSON.stringify({ postId, voice, direction, options, total, body: { ...body, set: undefined }, slides: withCameras, cost: meter.summary() }, null, 2));
  console.log(`total ${total.toFixed(1)} s (was ${body.durationSeconds} s) — ${dir}`);
  console.log(JSON.stringify(meter.summary()));
  await prisma.$disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
