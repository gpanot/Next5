// server-only — never import from a 'use client' file.
// Quote checks: a model's claim about a text counts only if the quoted words are really in that text.

const normalize = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\p{L}\p{N}$%&'"+\-.,!?/ ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** True when `quote` (at least 3 characters once cleaned) appears word for word in `source`. */
export const isVerbatim = (quote: unknown, source: string): quote is string => {
  if (typeof quote !== 'string') return false;
  const q = normalize(quote).replace(/^["'.…]+|["'.…]+$/g, '').trim();
  return q.length >= 3 && normalize(source).includes(q);
};
