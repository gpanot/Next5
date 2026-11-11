// When each line of an on-screen list appears: on the first word of that line Guillaume says, like the reference's
// list that uncovers item by item as it is spoken. Pure, so it is unit tested. Times are seconds of the joined take.

export type SpokenWord = { text: string; start: number; end: number };

const STOP = new Set(['the', 'and', 'you', 'your', 'for', 'are', 'but', 'with', 'that', 'this', 'not', 'can', 'all', 'get', 'has', 'have', 'its', 'our', 'out', 'was', 'want', 'must', 'need', 'will']);

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');

/** The words of a line worth listening for: no short or filler words. */
const keyWords = (line: string) => line.split(/\s+/).map(norm).filter((w) => w.length >= 3 && !STOP.has(w));

/** A list = 3 lines or more; a title or a single sentence shows whole at the start of the shot. */
export const isList = (text: string) => text.split('\n').filter((l) => l.trim()).length >= 3;

/**
 * One time per line. Line 1 (the list's header) shows at the shot start; every other line on the first said word
 * that matches it, after the line before. A line never heard lands 0.6 s after the line before (never past the end).
 */
export const revealTimes = (lines: string[], words: SpokenWord[], from: number, to: number): number[] => {
  const heard = words.filter((w) => w.start >= from && w.start < to);
  const times: number[] = [];
  let after = from;
  lines.forEach((line, i) => {
    if (i === 0) {
      times.push(from);
      return;
    }
    const keys = new Set(keyWords(line));
    const hit = heard.find((w) => w.start > after && keys.has(norm(w.text)));
    const at = hit ? hit.start : Math.min(after + 0.6, to - 0.1);
    times.push(Math.round(at * 100) / 100);
    after = at;
  });
  return times;
};

/**
 * When Guillaume says `phrase` inside [from, to]: the start of the first heard word matching the phrase's first key
 * word (the second one when the first is never heard). Null when none is heard.
 */
export const cueTime = (phrase: string, words: SpokenWord[], from: number, to: number): number | null => {
  const heard = words.filter((w) => w.start >= from && w.start < to);
  for (const key of keyWords(phrase).slice(0, 2)) {
    const hit = heard.find((w) => norm(w.text) === key);
    if (hit) return Math.round(hit.start * 100) / 100;
  }
  return null;
};
