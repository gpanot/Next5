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

/** Short prefixes of the industry's meaningful words ("auto mechanics" → ["auto", "mechan"]). */
function stems(industry: string): string[] {
  return normalize(industry)
    .split(' ')
    .filter((w) => w.length >= 4)
    .map((w) => w.slice(0, 6));
}

export type IndustryClaim = { industry: string; evidence: string };

/**
 * An industry is kept only when BOTH hold:
 *  1. its evidence quote appears verbatim (after normalization) in the crawled text, and
 *  2. the quote actually mentions the industry (a word stem of the industry is in the quote).
 * Rule 2 stops a real but generic quote ("service-based businesses") from being cited as
 * proof of an invented niche ("beauty salons").
 */
export function groundIndustries(raw: unknown, crawlText: string): { industries: string[]; evidence: string[] } {
  if (!Array.isArray(raw)) return { industries: [], evidence: [] };
  const haystack = normalize(crawlText);
  const industries: string[] = [];
  const evidence: string[] = [];

  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const { industry, evidence: quote } = item as Partial<IndustryClaim>;
    if (typeof industry !== 'string' || typeof quote !== 'string') continue;

    const q = normalize(quote);
    if (q.length < 3 || !haystack.includes(q)) continue;

    const industryStems = stems(industry);
    if (industryStems.length === 0 || !industryStems.some((s) => q.includes(s))) continue;

    const name = industry.trim();
    if (industries.some((i) => i.toLowerCase() === name.toLowerCase())) continue;
    industries.push(name);
    evidence.push(quote.trim());
  }

  return { industries: industries.slice(0, 5), evidence: evidence.slice(0, 5) };
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
