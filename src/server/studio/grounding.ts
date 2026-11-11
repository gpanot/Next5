/**
 * Campaign Studio — evidence grounding for LLM-inferred fields.
 * Pure functions, no I/O.
 *
 * The LLM is told to "invent nothing", but for target-customer industries it reliably pads
 * the list from world knowledge ("booking software" → beauty salons, fitness studios,
 * health clinics) even when the page only evidences one niche. Prompting alone does not stop
 * this, so every industry must now cite a quote, and the quote is checked against the
 * crawled text in code.
 */

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[^a-z0-9']+/g, ' ')
    .trim();
}

/**
 * A counter the site animates in the browser, read before it counted up: "0+ Google Reviews", "0 Clients Served".
 * "0% fees" and "0 hidden fees" are real claims, so without a "+" only a count of people or work matches.
 */
const ZERO_COUNTER = /^\s*0\s*(\+|(?=\s+(?:\w+\s+){0,2}(?:reviews?|ratings?|clients?|customers?|years?|projects?|jobs?|homes?|students?|members?|users?|patients?|sales|orders?)\b))/i;
export const isZeroCounter = (text: string): boolean => ZERO_COUNTER.test(text);

/** The text without lines that are unread counters (profiles saved before the crawl fixed them). */
export const stripZeroCounters = (text: string): string => text.split('\n').filter((line) => !isZeroCounter(line)).join('\n');

/** Short prefixes of the industry's meaningful words ("auto mechanics" → ["auto", "mechan"]). */
function stems(industry: string): string[] {
  return normalize(industry)
    .split(' ')
    .filter((w) => w.length >= 4)
    .map((w) => w.slice(0, 6));
}

export type IndustryClaim = { industry: string; evidence: string };

/** Most industries kept per site: the owner picks from them, 5 at most. */
export const MAX_GROUNDED_INDUSTRIES = 8;

const HEADING = /^#{1,6}\s+(.+)$/;

/** Each markdown heading of the crawl with the normalized text under it, up to the next heading. */
const headedSections = (crawlText: string): Array<{ heading: string; body: string }> => {
  const out: Array<{ heading: string; lines: string[] }> = [];
  for (const line of crawlText.split('\n')) {
    const heading = line.trim().match(HEADING)?.[1];
    if (heading) out.push({ heading: normalize(heading), lines: [] });
    else out.at(-1)?.lines.push(line);
  }
  return out.map((s) => ({ heading: s.heading, body: normalize(s.lines.join(' ')) }));
};

/** True when a heading has every stem of the industry and the quote is in the text under it. */
const quotedUnderHeading = (stemsOf: string[], quote: string, sections: Array<{ heading: string; body: string }>): boolean =>
  sections.some((s) => stemsOf.every((stem) => s.heading.includes(stem)) && s.body.includes(quote));

/** The homepage part of a crawl (siteCrawl.ts); the whole text when it has no such section. */
const homepageOf = (crawlText: string): string => {
  const start = crawlText.indexOf('## Homepage');
  if (start < 0) return crawlText;
  const end = crawlText.indexOf('\n## Page /', start);
  return end < 0 ? crawlText.slice(start) : crawlText.slice(start, end);
};

/** Times the homepage names the industry. */
const homepageMentions = (industry: string, home: string): number => {
  const name = normalize(industry);
  return name ? home.split(name).length - 1 : 0;
};

/**
 * Keeps the industries the homepage stresses first: a site's list of sectors is usually alphabetical or in menu order,
 * and only the first few get content. Ties keep the order they came in.
 */
export function rankIndustries(grounded: { industries: string[]; evidence: string[] }, crawlText: string): { industries: string[]; evidence: string[] } {
  const home = normalize(homepageOf(crawlText));
  const order = grounded.industries
    .map((name, i) => ({ i, mentions: homepageMentions(name, home) }))
    .sort((a, b) => b.mentions - a.mentions || a.i - b.i);
  return { industries: order.map((o) => grounded.industries[o.i]!), evidence: order.map((o) => grounded.evidence[o.i]!) };
}

/**
 * An industry is kept only when BOTH hold:
 *  1. its evidence quote appears verbatim (after normalization) in the crawled text, and
 *  2. the quote mentions the industry (a word stem of the industry is in the quote), or the quote sits right under a
 *     heading naming it ("### Real Estate" over "Trusted plumbing services for rental and investment properties").
 * Rule 2 stops a real but generic quote ("service-based businesses") from being cited as
 * proof of an invented niche ("beauty salons").
 */
export function groundIndustries(raw: unknown, crawlText: string): { industries: string[]; evidence: string[] } {
  if (!Array.isArray(raw)) return { industries: [], evidence: [] };
  const haystack = normalize(crawlText);
  const sections = headedSections(crawlText);
  const industries: string[] = [];
  const evidence: string[] = [];

  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const { industry, evidence: quote } = item as Partial<IndustryClaim>;
    if (typeof industry !== 'string' || typeof quote !== 'string') continue;

    const q = normalize(quote);
    if (q.length < 3 || !haystack.includes(q)) continue;

    const industryStems = stems(industry);
    if (industryStems.length === 0) continue;
    if (!industryStems.some((s) => q.includes(s)) && !quotedUnderHeading(industryStems, q, sections)) continue;

    const name = industry.trim();
    if (industries.some((i) => i.toLowerCase() === name.toLowerCase())) continue;
    industries.push(name);
    evidence.push(quote.trim());
  }

  return { industries: industries.slice(0, MAX_GROUNDED_INDUSTRIES), evidence: evidence.slice(0, MAX_GROUNDED_INDUSTRIES) };
}

export type ProofClaim = { claim: string; evidence: string };

/**
 * Proof points (testimonials, metrics, client counts) for the slideshow engine's Proof shot.
 * Kept only when:
 *  1. the evidence quote appears verbatim (after normalization) in the crawled text, and
 *  2. every number in the short claim also appears in the quote (no rounded-up "10,000+").
 */
export function groundProofPoints(raw: unknown, crawlText: string): ProofClaim[] {
  if (!Array.isArray(raw)) return [];
  const haystack = normalize(crawlText);
  const out: ProofClaim[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const { claim, evidence } = item as Partial<ProofClaim>;
    if (typeof claim !== 'string' || typeof evidence !== 'string') continue;
    if (isZeroCounter(claim) || isZeroCounter(evidence)) continue;
    const q = normalize(evidence);
    if (q.length < 8 || !haystack.includes(q)) continue;
    const quoteDigits = evidence.replace(/[,\s]/g, '');
    const claimNumbers = claim.match(/\d[\d,.]*/g) ?? [];
    if (!claimNumbers.every((n) => quoteDigits.includes(n.replace(/,/g, '')))) continue;
    if (out.some((p) => p.claim.toLowerCase() === claim.trim().toLowerCase())) continue;
    out.push({ claim: claim.trim(), evidence: evidence.trim() });
  }
  return out.slice(0, 5);
}
