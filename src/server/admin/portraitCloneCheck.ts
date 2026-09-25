// Pure checks for a Portrait Clone JSON: the skill's freedom, de-slop and absence/consistency self-checks,
// done in code because models skip them. No I/O — safe to unit test.

type JsonRecord = Record<string, unknown>;

/** Paths whose text is instructions or skill-sanctioned boilerplate, not a description to lock. */
const SKIPPED_ROOTS = new Set(['negative_prompt', 'generation_params', 'post_processing', 'prompt_id', 'prompt_language']);

/** Words that leave a choice to the model (skill step 7, freedom check). */
const VAGUE: { label: string; pattern: RegExp }[] = [
  // The skill's own MEDIUM line says "never as a render or retouched photo"; that "or" is a list, not a choice.
  { label: 'or', pattern: /\bor\b(?! retouched)/i },
  { label: 'natural', pattern: /\bnatural(ly)?\b/i },
  { label: 'slight', pattern: /\bslight(ly)?\b/i },
  { label: 'some', pattern: /\bsome\b/i },
  { label: 'various', pattern: /\bvarious\b/i },
  { label: 'several', pattern: /\bseveral\b/i },
  { label: 'typical', pattern: /\btypical\b/i },
  { label: 'casual', pattern: /\bcasual\b/i },
  { label: 'a bit', pattern: /\ba bit\b/i },
  // "around 30" is a guess; "around the crown" is a place.
  { label: 'around (number)', pattern: /\baround\s+\d/i },
  { label: 'e.g.', pattern: /\be\.g\./i },
  { label: 'optional', pattern: /\boptional\b/i },
  { label: 'approximately (no number)', pattern: /\bapproximately\b(?!\s*\d)/i },
  { label: 'slash choice', pattern: /[a-z]\/[a-z]/i },
  { label: 'range', pattern: /\b\d+(\.\d+)?\s*(-|–|to)\s*\d+(\.\d+)?\s*(years|cm|mm|m|degrees|%)?\b(?!:)/i },
];

/** Quality boosters that must never appear in positive fields (skill step 5, de-slop). */
const BOOSTERS = /\b(4k|8k|ultra-detailed|hyper-detailed|masterpiece|best quality|sharp|crisp|flawless|stunning|perfect(ly)?|intricate)\b/i;

/** Common additions: when present they must not be negated; when "none" they must be negated. */
const ITEMS: { path: [string, string]; terms: string[] }[] = [
  { path: ['jewelry', 'earrings'], terms: ['earring', 'earrings'] },
  { path: ['jewelry', 'necklace'], terms: ['necklace', 'necklaces'] },
  { path: ['jewelry', 'bracelet'], terms: ['bracelet', 'bracelets'] },
  { path: ['jewelry', 'watch'], terms: ['watch', 'wristwatch'] },
  { path: ['accessories', 'glasses'], terms: ['glasses', 'eyeglasses', 'sunglasses'] },
  { path: ['accessories', 'headwear'], terms: ['hat', 'cap', 'headwear', 'headband'] },
  { path: ['accessories', 'bag'], terms: ['bag', 'handbag'] },
  { path: ['body_marks', 'tattoos'], terms: ['tattoo', 'tattoos'] },
];

const ABSENT = /^\s*(none|not visible|no\b)/i;

/** Every string value with its dotted path, skipping instruction-only roots. */
const collectStrings = (value: unknown, path: string, out: { path: string; text: string }[]): void => {
  if (typeof value === 'string') out.push({ path, text: value });
  else if (Array.isArray(value)) value.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out));
  else if (typeof value === 'object' && value !== null) {
    for (const [k, v] of Object.entries(value)) {
      if (!path && SKIPPED_ROOTS.has(k)) continue;
      collectStrings(v, path ? `${path}.${k}` : k, out);
    }
  }
};

const negativeTerms = (json: JsonRecord): string[] => {
  const lines = Array.isArray(json.negative_prompt) ? json.negative_prompt.map(String) : [];
  return lines.flatMap((l) => l.split(/[,/]/)).map((t) => t.trim().toLowerCase()).filter(Boolean);
};

const valueAt = (json: JsonRecord, [a, b]: [string, string]): string | undefined => {
  const group = json[a];
  const v = typeof group === 'object' && group !== null ? (group as JsonRecord)[b] : undefined;
  return typeof v === 'string' ? v : undefined;
};

const wordCheckIssues = (json: JsonRecord): string[] => {
  const strings: { path: string; text: string }[] = [];
  collectStrings(json, '', strings);
  const issues: string[] = [];
  for (const { path, text } of strings) {
    const vague = VAGUE.find((v) => v.pattern.test(text));
    if (vague) issues.push(`${path}: "${text}" uses the open word "${vague.label}". Replace it with one concrete measured value.`);
    const booster = BOOSTERS.exec(text);
    if (booster) issues.push(`${path}: "${text}" contains the quality booster "${booster[0]}". Remove it.`);
  }
  return issues;
};

const itemCheckIssues = (json: JsonRecord): string[] => {
  const negatives = negativeTerms(json);
  const issues: string[] = [];
  for (const { path, terms } of ITEMS) {
    const value = valueAt(json, path);
    if (value === undefined) continue;
    const label = path.join('.');
    if (!ABSENT.test(value) && negatives.some((t) => terms.includes(t))) {
      issues.push(`${label} is "${value}" but negative_prompt bans "${terms[terms.length - 1]}". Remove the bare item from negative_prompt; only negate wrong variants.`);
    }
    if (ABSENT.test(value) && !negatives.some((t) => terms.some((term) => t.includes(term)))) {
      issues.push(`${label} is "${value}" but negative_prompt does not list "${terms[terms.length - 1]}". Add it.`);
    }
  }
  return issues;
};

/** All problems found. Empty means the JSON passes the self-check. */
export const checkPortraitJson = (json: JsonRecord): string[] => [...wordCheckIssues(json), ...itemCheckIssues(json)];
