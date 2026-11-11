/**
 * The quality bar for guides and blog posts, as data. tests/content/articles.test.ts enforces it, and
 * docs/seo/QUALITY_BAR.md explains it to the writing agent. Change a number here and both follow.
 *
 * Every article must pass the BASE rules. Articles published on or after QUALITY_BAR_SINCE must also
 * pass the STRICT rules: the 14 articles that predate the SEO loop are grandfathered until rewritten.
 */
export const QUALITY_BAR_SINCE = '2026-10-20';

export const BASE = {
  /** Google shows about 60 characters of a title and 155 of a description. */
  maxTitle: 65,
  minDescription: 70,
  maxDescription: 160,
} as const;

export const STRICT = {
  minWords: 800,
  maxWords: 1800,
  /** Links to other Next5 articles inside the body (not counting "Keep reading"). */
  minArticleLinks: 3,
  minFaq: 5,
  maxAnswerChars: 400,
  /** Phrases that mark filler or machine-written copy. Matched case-insensitively. */
  bannedPhrases: [
    "in today's",
    'fast-paced',
    'digital landscape',
    'game-changer',
    'game changer',
    'unlock the',
    'unleash',
    'delve',
    'elevate your',
    'look no further',
    'in conclusion',
    'it is important to note',
    'whether you are a',
    'the ultimate guide',
    'navigating the',
    '—',
  ],
} as const;

/** Site pages an article may link to besides other articles. */
export const STATIC_LINK_TARGETS: readonly string[] = ['/', '/pricing', '/guides', '/privacy', '/terms'];
