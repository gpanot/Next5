// server-only — never import from a 'use client' file.
// Fair Housing Act: phrases that describe people rather than property are forbidden in listing copy.

/**
 * Case-insensitive banned phrases. Any occurrence in slide text, caption or hashtags
 * causes validateSlideshowCopy to return an error so the copy engine can retry or fall back.
 */
export const FAIR_HOUSING_PHRASES: readonly string[] = [
  'perfect for families',
  'family friendly',
  'family-friendly',
  'safe neighborhood',
  'great schools',
  'good schools',
  'top schools',
  'exclusive',
  'walk to church',
  'bachelor pad',
  'ideal for young',
  'ideal for couples',
  'empty nesters',
  'no children',
  'mature community',
  'adult community',
  'handicapped',
  'wheelchair accessible',
  'near mosque',
  'near temple',
  'near synagogue',
  'near church',
  'christian',
  'jewish',
  'muslim',
  'integrated',
  'traditional neighborhood',
];

/** Returns true if the text contains any banned Fair Housing phrase (case-insensitive). */
export const hasFairHousingViolation = (text: string): boolean => {
  const lower = text.toLowerCase();
  return FAIR_HOUSING_PHRASES.some((phrase) => lower.includes(phrase));
};
