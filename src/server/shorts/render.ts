// server-only — never import from a 'use client' file.
// Final 1080×1920 assembly: each beat's clip cut to its narration span (a slow zoom of its photo when the clip failed),
// one-word-at-a-time captions + accents burned with libass, and the narration muxed in one ffmpeg pass.

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { ShortBeat, WordTiming } from '../../types/admin/shorts';
import { ffmpeg, fontDir, withTempDir } from './ffmpeg';

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

/** Word burst (170 px, bottom third) + accents (hook title on top, others above the words). Montserrat Bold. */
export const buildAss = (words: WordTiming[], beats: ShortBeat[]): string => {
  const head = [
    '[Script Info]', 'ScriptType: v4.00+', `PlayResX: ${W}`, `PlayResY: ${H}`, 'WrapStyle: 0', '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Word,Montserrat,170,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,10,0,2,40,40,${Math.round(0.26 * H)},1`,
    `Style: AccentTop,Montserrat,110,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,6,0,8,40,40,${Math.round(0.22 * H)},1`,
    `Style: AccentLow,Montserrat,110,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,6,0,2,40,40,${Math.round(0.38 * H)},1`,
    '', '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];
  const wordLines = words
    .map((w) => ({ ...w, text: burstWord(w.word) }))
    .filter((w) => w.text && w.endS > w.startS)
    .map((w) => `Dialogue: 0,${assTime(w.startS)},${assTime(w.endS)},Word,,0,0,0,,${w.text}`);
  const accentLines = beats
    .filter((b) => b.accent)
    .map((b) => `Dialogue: 2,${assTime(b.startS)},${assTime(b.startS + b.spanS)},${b.role === 'hook' ? 'AccentTop' : 'AccentLow'},,0,0,0,,${assText(b.accent ?? '').toUpperCase()}`);
  return [...head, ...wordLines, ...accentLines, ''].join('\n');
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

/** The finished short (mp4) and a poster frame (jpg). */
export const renderShort = (beats: RenderBeat[], wav: Buffer, words: WordTiming[]): Promise<{ video: Buffer; poster: Buffer }> =>
  withTempDir(async (dir) => {
    const cuts = await Promise.all(beats.map((b) => cutBeat(b, dir)));
    const audio = path.join(dir, 'voice.wav');
    const ass = path.join(dir, 'captions.ass');
    const out = path.join(dir, 'short.mp4');
    const poster = path.join(dir, 'poster.jpg');
    await writeFile(audio, wav);
    await writeFile(ass, buildAss(words, beats.map((b) => b.beat)));
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
