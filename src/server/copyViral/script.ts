// server-only — never import from a 'use client' file.
// Guillaume's lines for each shot: the reference's words, nearly verbatim. Only punctuation and what would be false in
// his mouth (another creator's name, handle or personal facts) change; nothing is steered toward Next5. Uses the Brand
// Blueprint script model (GPT-6.1 Sol or Claude Opus 5.5).

import { HttpError } from '../http';
import type { ToolDef } from '../scriptGenerator/anthropic';
import { callBlueprintModel, type ModelCall } from '../scriptGenerator/model';
import { stripDashes } from '../scriptGenerator/normalize';
import type { CopyViralShot, CopyViralStyle } from '../../types/admin/copyViral';

const SYSTEM = `You prepare a viral reel's script for another creator, Guillaume (@happygiom on Instagram and TikTok), who
will re-record it shot by shot. The reel works because of its exact wording, so keep the original words.

Rules:
- One line per shot, same order.
- Keep the original words, sentence shapes and length. Add normal punctuation (the transcript has none) and fix obvious
  transcription mistakes.
- Change a word only when it would be false or odd for Guillaume to say it: the original creator's name, handle or
  personal facts become Guillaume's or neutral. Keep the topic, the niche, the examples, the numbers and the claims.
- Never mention, introduce or promote Next5 or any product of Guillaume's. Add no new idea, pitch or brand.
- No dashes.
- Shots with no speech: empty line.
- On-screen text: exactly the words shown on screen, with the same small changes only, same number of lines, lines
  separated by \n, never a description or brackets; empty when the shot has none.
- The CTA keeps the original's mechanic and words (comment a word, follow, link); only a handle becomes @happygiom.
- caption: the post caption, short, in the original reel's style, ends with the same call to action. No Next5.
Call the submit_lines tool.`;

const TOOL: ToolDef = {
  name: 'submit_lines',
  description: "Submit Guillaume's line and on-screen text for every shot, and the post caption.",
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['shots', 'caption'],
    properties: {
      shots: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['shot', 'line', 'on_screen_text'],
          properties: { shot: { type: 'integer' }, line: { type: 'string' }, on_screen_text: { type: 'string' } },
        },
      },
      caption: { type: 'string' },
    },
  },
};

const userMessage = (shots: CopyViralShot[], style: CopyViralStyle | null) => [
  style ? `Reel look: hook = ${style.hook}; ending = ${style.cta}` : '',
  'Original shots:',
  ...shots.map((s, i) => [
    `Shot ${i + 1} (${((s.endMs - s.startMs) / 1000).toFixed(1)} s)`,
    `  said: ${s.transcript || '(nothing)'}`,
    `  on-screen text: ${s.reading?.onScreenText || '(none)'}`,
    `  what we see: ${s.reading ? `${s.reading.layout}, ${s.reading.direction}` : '(unknown)'}`,
  ].join('\n')),
].filter(Boolean).join('\n');

export type WrittenLines = { lines: { myLine: string; myOnScreenText: string }[]; caption: string };

const clean = (v: unknown) => (typeof v === 'string' ? stripDashes(v).trim() : '');

export const writeLines = async (shots: CopyViralShot[], style: CopyViralStyle | null, call: ModelCall = callBlueprintModel): Promise<WrittenLines> => {
  const out = (await call(SYSTEM, userMessage(shots, style), TOOL)) as { shots?: unknown; caption?: unknown } | null;
  const raw = Array.isArray(out?.shots) ? (out.shots as Record<string, unknown>[]) : [];
  if (raw.length === 0) throw new HttpError(502, 'invalid_lines', 'The new lines came back empty. Try again.');
  const byShot = (i: number) => raw.find((r) => r.shot === i + 1) ?? raw[i];
  return {
    lines: shots.map((_, i) => ({ myLine: clean(byShot(i)?.line), myOnScreenText: clean(byShot(i)?.on_screen_text) })),
    caption: clean(out?.caption),
  };
};
