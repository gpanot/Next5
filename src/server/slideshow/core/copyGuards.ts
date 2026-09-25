// server-only — never import from a 'use client' file.
// Shared copy guards for both engines: word counts, anti-slop phrases, restatement check.
// Deterministic and LLM-free, so the same rules run at generation time and on editor save.

export const wordCount = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

/**
 * Filler that signals AI-written or agent-template copy. Hormozi rule: specific beats vague.
 * A line that leans on one of these says nothing a viewer can check, so it is rejected.
 */
export const SLOP_PHRASES: readonly string[] = [
  'dream home',
  'stunning',
  'nestled',
  'boasts',
  'look no further',
  'must-see',
  'must see',
  "won't last",
  'will not last',
  'hidden gem',
  'oasis',
  'luxurious',
  'elevate',
  'unlock',
  'game changer',
  'game-changer',
  'seamless',
  'effortless',
  'in today',
  'imagine',
  'welcome home',
  'turnkey',
  'breathtaking',
  'one of a kind',
  'one-of-a-kind',
  'this is your sign',
  'act fast',
  "don't miss",
  'dont miss',
  'settle for less',
  'settling for less',
  'has it all',
];

/** Returns the first slop phrase found in the text, or null. */
export const findSlopPhrase = (text: string): string | null => {
  const lower = text.toLowerCase().replace(/[’]/g, "'");
  return SLOP_PHRASES.find((p) => lower.includes(p)) ?? null;
};

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'for', 'with', 'at', 'by',
  'is', 'are', 'was', 'be', 'it', 'this', 'that', 'you', 'your', 'i', 'me', 'my', 'we', 'our',
  'here', 'heres', "here's", 'just', 'so', 'do', 'dont', "don't", 'not', 'no', 'all', 'from',
]);

/** Content words of a line, lowercased, punctuation stripped, stop words removed. */
export const contentWords = (text: string): Set<string> =>
  new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9$\s']/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w)),
  );

/**
 * Jaccard overlap of content words (0 to 1). Cheap stand-in for embedding similarity:
 * used for hook dedup and for "Shot 6 must not restate the Pain line".
 */
export const wordOverlap = (a: string, b: string): number => {
  const wa = contentWords(a);
  const wb = contentWords(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  wa.forEach((w) => { if (wb.has(w)) shared += 1; });
  return shared / (wa.size + wb.size - shared);
};

/** Spelled-out numbers count as numbers ("cooking for six"). "one" is left out: it is mostly not a count. */
const NUMBER_WORDS: Record<string, string> = {
  two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  eleven: '11', twelve: '12', fifteen: '15', twenty: '20', thirty: '30', fifty: '50', hundred: '100',
};

const spellOutToDigits = (text: string): string =>
  text.replace(/\b[a-z]+\b/gi, (w) => NUMBER_WORDS[w.toLowerCase()] ?? w);

/** Numbers in a line, normalized: "$549k" -> "549000", "2,100" -> "2100", "six" -> "6". */
export const extractNumbers = (text: string): string[] =>
  (spellOutToDigits(text).match(/\$?\d[\d,]*(?:\.\d+)?[kKmM]?/g) ?? []).map((raw) => {
    const clean = raw.replace(/[$,]/g, '');
    const unit = clean.slice(-1).toLowerCase();
    if (unit === 'k') return String(Math.round(parseFloat(clean) * 1_000));
    if (unit === 'm') return String(Math.round(parseFloat(clean) * 1_000_000));
    return clean;
  });
