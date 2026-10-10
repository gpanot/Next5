// server-only — never import from a 'use client' file.
// Final 1080×1920 assembly: each beat's clip cut to its narration span (a slow zoom of its photo when the clip failed),
// the on-screen text burned with libass, and the narration muxed in one ffmpeg pass: one-word-at-a-time captions in the
// bottom third (removed 2026-10-08, back by user request 2026-10-10), the hook on the first scene and the call to action
// on the last, above the caption words.

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { ShortBeat, WordTiming } from '../../types/admin/shorts';
import { ffmpeg, fontDir, withTempDir } from './ffmpeg';
import { HOOK_DEFAULT_TOP, HOOK_SIDE_MARGIN, HOOK_STYLES, hookText, type HookStyle } from './hookFit';

const W = 1080;
const H = 1920;
const FPS = 30;

export type RenderBeat = { beat: ShortBeat; clip: Buffer | null; photo: Buffer };

const assTime = (s: number): string => {
  const cs = Math.max(0, Math.round(s * 100));
  const h = Math.floor(cs / 360_000);
  const m = Math.floor((cs % 360_000) / 6_000);
  const sec = Math.floor((cs % 6_000) / 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`;
};

const assText = (t: string) => t.replace(/[{}\\*]/g, '').trim();
/** One caption word: no brackets, quotes or end punctuation (a lone "(without" or "seats," reads as noise). */
const burstWord = (w: string) => assText(w).replace(/^[("“'‘]+|[)"”'’.,!?;:]+$/g, '');

/** The spoken words, one at a time, while each is said. */
const wordLines = (words: WordTiming[]): string[] =>
  words
    .map((w) => ({ ...w, text: burstWord(w.word) }))
    .filter((w) => w.text && w.endS > w.startS)
    .map((w) => `Dialogue: 0,${assTime(w.startS)},${assTime(w.endS)},Word,,0,0,0,,${w.text}`);

/** ASS style name of each hook look. */
const HOOK_ASS_STYLE: Record<HookStyle, string> = { 'tiktok-red': 'HookRed', 'white-box': 'HookWhite' };

/** A hook style as an ASS style: an opaque box (BorderStyle 3) behind each line, the outline width as padding. */
const hookStyleLine = (style: HookStyle): string => {
  const s = HOOK_STYLES[style];
  return `Style: ${HOOK_ASS_STYLE[style]},${s.font},${s.sizePx},${s.text},${s.text},${s.box},${s.box},${s.bold ? -1 : 0},0,0,0,100,100,0,0,3,${s.padPx},0,8,${HOOK_SIDE_MARGIN},${HOOK_SIDE_MARGIN},${HOOK_DEFAULT_TOP},1`;
};

const isHookStyle = (v: unknown): v is HookStyle => typeof v === 'string' && v in HOOK_STYLES;

/** The style and text of one beat's line: the hook in its picked Blitz style (Montserrat on older shorts), the CTA low. */
const accentLook = (b: ShortBeat): { style: string; text: string } => {
  const text = assText(b.accent ?? '');
  if (b.role !== 'hook') return { style: 'AccentLow', text: text.toUpperCase() };
  if (isHookStyle(b.accentStyle)) return { style: HOOK_ASS_STYLE[b.accentStyle], text: hookText(text, b.accentStyle) };
  return { style: 'AccentTop', text: text.toUpperCase() };
};

/** The caption words, and each beat's on-screen text: the hook at the top of the first scene, the call to action on the last. */
export const buildAss = (beats: ShortBeat[], words: WordTiming[] = []): string => {
  const head = [
    '[Script Info]', 'ScriptType: v4.00+', `PlayResX: ${W}`, `PlayResY: ${H}`, 'WrapStyle: 0', '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: AccentTop,Montserrat,96,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,7,0,8,70,70,${HOOK_DEFAULT_TOP},1`,
    hookStyleLine('tiktok-red'),
    hookStyleLine('white-box'),
    `Style: Word,Montserrat,170,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,10,0,2,40,40,${Math.round(0.26 * H)},1`,
    // Above the caption words (bottom margin 26% + one 170 px word line).
    `Style: AccentLow,Montserrat,96,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,7,0,2,70,70,${Math.round(0.38 * H)},1`,
    '', '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];
  const accentLines = beats
    .filter((b) => b.accent)
    .map((b) => {
      const { style, text } = accentLook(b);
      // Auto Fit's spot for the hook: the margin from the top (alignment 8 = top centre), so line wrapping is kept.
      // The opaque box grows by its padding above the text, so the text starts that much lower.
      const pad = b.role === 'hook' && isHookStyle(b.accentStyle) ? HOOK_STYLES[b.accentStyle].padPx : 0;
      const marginV = b.role === 'hook' && typeof b.accentTopY === 'number' ? b.accentTopY + pad : 0;
      return `Dialogue: 2,${assTime(b.startS)},${assTime(b.startS + b.spanS)},${style},,0,0,${marginV},,${text}`;
    });
  return [...head, ...wordLines(words), ...accentLines, ''].join('\n');
};

/** One silent 1080×1920 clip exactly `beat.spanS` long. A short source holds its last frame. */
const cutBeat = async (rb: RenderBeat, dir: string): Promise<string> => {
  const out = path.join(dir, `beat-${rb.beat.idx}.mp4`);
  const span = rb.beat.spanS.toFixed(3);
  const fit = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1`;
  if (rb.clip) {
    const src = path.join(dir, `clip-${rb.beat.idx}.mp4`);
    await writeFile(src, rb.clip);
    const vf = `${fit},fps=${FPS},tpad=stop_mode=clone:stop_duration=${span},trim=end=${span},setpts=PTS-STARTPTS,format=yuv420p`;
    await ffmpeg(['-i', src, '-vf', vf, '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-r', String(FPS), '-t', span, out]);
    return out;
  }
  const src = path.join(dir, `photo-${rb.beat.idx}.jpg`);
  await writeFile(src, rb.photo);
  const frames = Math.ceil(rb.beat.spanS * FPS);
  const zoom = `scale=${W * 2}:${H * 2}:force_original_aspect_ratio=increase,crop=${W * 2}:${H * 2},zoompan=z='min(zoom+0.0008,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS},format=yuv420p`;
  await ffmpeg(['-loop', '1', '-i', src, '-vf', zoom, '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-t', span, out]);
  return out;
};

const escapeFilterPath = (p: string) => p.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");

/** One 1080×1920 JPEG of `photo` with `beat`'s on-screen text burned in where the render would put it (Auto Fit's input). */
export const previewFrame = (photo: Buffer, beat: ShortBeat): Promise<Buffer> =>
  withTempDir(async (dir) => {
    const src = path.join(dir, 'photo.jpg');
    const ass = path.join(dir, 'preview.ass');
    const out = path.join(dir, 'preview.jpg');
    await writeFile(src, photo);
    await writeFile(ass, buildAss([{ ...beat, startS: 0, spanS: 5 }]));
    const vf = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},subtitles='${escapeFilterPath(ass)}':fontsdir='${escapeFilterPath(fontDir())}'`;
    await ffmpeg(['-i', src, '-vf', vf, '-frames:v', '1', '-q:v', '3', out]);
    return readFile(out);
  });

/** The finished short (mp4) and a poster frame (jpg). `words`: the narration's word timings, burned one at a time. */
export const renderShort = (beats: RenderBeat[], wav: Buffer, words: WordTiming[] = []): Promise<{ video: Buffer; poster: Buffer }> =>
  withTempDir(async (dir) => {
    const cuts = await Promise.all(beats.map((b) => cutBeat(b, dir)));
    const audio = path.join(dir, 'voice.wav');
    const ass = path.join(dir, 'captions.ass');
    const out = path.join(dir, 'short.mp4');
    const poster = path.join(dir, 'poster.jpg');
    await writeFile(audio, wav);
    await writeFile(ass, buildAss(beats.map((b) => b.beat), words));
    const total = beats.reduce((s, b) => s + b.beat.spanS, 0).toFixed(3);
    const n = cuts.length;
    const graph = `${cuts.map((_, i) => `[${i}:v]`).join('')}concat=n=${n}:v=1:a=0[cat];[cat]subtitles='${escapeFilterPath(ass)}':fontsdir='${escapeFilterPath(fontDir())}'[v];[${n}:a]apad[a]`;
    await ffmpeg([
      ...cuts.flatMap((c) => ['-i', c]), '-i', audio,
      '-filter_complex', graph, '-map', '[v]', '-map', '[a]',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-t', total, '-movflags', '+faststart', out,
    ], 300_000);
    await ffmpeg(['-ss', '0.6', '-i', out, '-frames:v', '1', '-vf', 'scale=540:-2', '-q:v', '4', poster]);
    return { video: await readFile(out), poster: await readFile(poster) };
  });
