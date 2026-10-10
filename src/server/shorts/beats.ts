// server-only — never import from a 'use client' file.
// One beat per spoken section (hook, each mechanism line, payoff), placed on the real audio timeline.
// Each beat is on screen exactly while its words are spoken, and the last one runs to the end of the audio,
// so the picture follows the narration and the voice is never cut off.

import type { ShortBeat, ShortScript, WordTiming } from '../../types/admin/shorts';
import { stripTags } from './voice';

const TAIL_S = 0.4;

const sections = (script: ShortScript): { role: ShortBeat['role']; text: string }[] => [
  { role: 'hook', text: script.hook },
  ...script.mechanismLines.map((text) => ({ role: 'mechanism' as const, text })),
  ...(script.payoffLine ? [{ role: 'payoff' as const, text: script.payoffLine }] : []),
];

export const planBeats = (script: ShortScript, words: WordTiming[], audioS: number): ShortBeat[] => {
  const parts = sections(script);
  const counts = parts.map((p) => stripTags(p.text).split(' ').filter(Boolean).length);
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  // Word counts match the spoken words when the narration is the sections joined; otherwise split by word share.
  const exact = total === words.length;
  let k = 0;
  const starts = counts.map((c, i) => {
    const s = i === 0 ? 0 : exact ? words[k].startS : (audioS * counts.slice(0, i).reduce((a, b) => a + b, 0)) / total;
    k += c;
    return s;
  });
  return parts.map((p, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : audioS + TAIL_S;
    return { idx: i, role: p.role, text: p.text, startS: starts[i], spanS: Math.max(1, end - starts[i]) };
  });
};

export { genSeconds } from '../../types/admin/shorts';
