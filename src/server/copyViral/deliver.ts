// server-only — never import from a 'use client' file.
// What comes after the engine's render: the .srt captions (for CapCut or Premiere).

import { readFile, writeFile } from 'fs/promises';

/** A word of the engine's timeline (assets/timeline.json), in SHORT time (after the cuts). */
export type TimelineWord = { text: string; start: number; end: number };

const stamp = (s: number) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(Math.floor(ms / 3_600_000))}:${pad(Math.floor(ms / 60_000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
};

/** Cues of up to `maxWords` words, cut at sentence ends and at pauses over 0.4 s. Pure, so it is unit tested. */
export const toSrt = (words: TimelineWord[], maxWords = 5): string => {
  const cues: TimelineWord[][] = [];
  let cue: TimelineWord[] = [];
  words.forEach((w, i) => {
    cue.push(w);
    const next = words[i + 1];
    if (!next || cue.length >= maxWords || /[.!?]$/.test(w.text) || next.start - w.end > 0.4) {
      cues.push(cue);
      cue = [];
    }
  });
  return cues
    .map((c, i) => `${i + 1}\n${stamp(c[0].start)} --> ${stamp(c[c.length - 1].end)}\n${c.map((w) => w.text.trim()).join(' ')}\n`)
    .join('\n');
};

export const writeSrt = async (timelineFile: string, out: string) => {
  const timeline = JSON.parse(await readFile(timelineFile, 'utf8')) as { words?: TimelineWord[] };
  await writeFile(out, toSrt(timeline.words ?? []));
};
