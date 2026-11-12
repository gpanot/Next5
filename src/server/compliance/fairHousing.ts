// Pure: no server imports, so it is unit tested.
// Fair Housing guard, deterministic layer (docs/business-studios/15-realtor-autopilot-plan.md §5.4).
// Blocks steering language about who a home is "for" (familial status, religion, race, disability, national origin,
// sex, age) and vague safety claims. The nano LLM layer comes in Phase B.

const PATTERNS: { re: RegExp; why: string }[] = [
  { re: /\b(perfect|ideal|great|made|built)\s+for\s+(a\s+)?(young\s+)?(famil(y|ies)|kids|children|couples?|singles?|retirees|empty[\s-]?nesters|seniors|professionals|bachelors?|newlyweds)\b/i, why: 'says who the home is for' },
  { re: /\bfamily[\s-]friendly\b/i, why: 'familial status' },
  { re: /\b(no|not\s+for)\s+(kids|children|families|students)\b/i, why: 'familial status' },
  { re: /\b(adults?\s+only|mature\s+(buyers?|couple|individuals?))\b/i, why: 'familial status / age' },
  { re: /\b(safe|safest|low[\s-]crime|crime[\s-]free|secure)\s+(neighbou?rhood|area|community|street|part\s+of\s+town)\b/i, why: 'safety claim' },
  { re: /\b(good|great|best|top[\s-]rated|excellent)\s+schools?\b/i, why: 'school quality claim' },
  { re: /\b(walking\s+distance|close|near|steps)\s+(to|from)\s+(the\s+)?(church|temple|synagogue|mosque|chapel)\b/i, why: 'religion' },
  { re: /\b(christian|jewish|muslim|catholic|hindu)\s+(neighbou?rhood|community|area|family)\b/i, why: 'religion' },
  { re: /\b(exclusive|private|restricted|traditional)\s+(neighbou?rhood|community|enclave)\b/i, why: 'exclusionary wording' },
  { re: /\b(integrated|diverse|ethnic|white|black|hispanic|asian|latino)\s+(neighbou?rhood|community|area)\b/i, why: 'race / national origin' },
  { re: /\b(handicap(ped)?|wheelchair[\s-]bound|able[\s-]bodied|no\s+wheelchairs)\b/i, why: 'disability' },
  { re: /\b(man\s+cave|bachelor\s+pad|mother[\s-]in[\s-]law|master\s+(bedroom|suite|bath))\b/i, why: 'gendered term (MLS style guides)' },
];

export type FairHousingHit = { phrase: string; why: string };

/** Every blocked phrase in the text, in order. Empty = clean. */
export const fairHousingHits = (text: string): FairHousingHit[] =>
  PATTERNS.flatMap(({ re, why }) => {
    const match = text.match(re);
    return match ? [{ phrase: match[0], why }] : [];
  });

export const isFairHousingClean = (texts: readonly string[]): boolean => texts.every((t) => fairHousingHits(t).length === 0);

/** One line the writer prompt can include so the model avoids the same phrases from the start. */
export const FAIR_HOUSING_RULES = `Fair Housing: describe the property, never the people it suits. Never say who it is "perfect for" (families, couples, retirees, kids), never call an area "safe", never rate schools, never mention churches or any religion, race, disability or "exclusive" communities. Say "primary bedroom", never "master". Use facts: rooms, sizes, features, distances to parks, shops and roads.`;
