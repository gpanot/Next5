// server-only — never import from a 'use client' file.
//
// Blitz videos are TikTok / Instagram value content, not ads (user, 2026-10-20): only the last slide (the CTA) may name
// the business. This catches a line or hook that pitches anyway: the business name (also with other spacing), "the app",
// "our", ratings, reviews, awards, endorsements. Press names alone are left to the prompt: single proof words ("Food")
// matched everyday lines.

const PITCH_WORDS = /\b(app|apps|our|we|reviews?|rated|ratings?|stars?|recommended|featured|award(?:s|ed)?|testimonials?|subscribe|download|sign up|free trial)\b/i;

const words = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export type PitchGuard = (text: string) => string | null;

/** Why this line pitches the business, or null when it is pure value. */
export function pitchGuard(business: string): PitchGuard {
  const squashed = words(business).replace(/ /g, '');
  return (text) => {
    if (squashed && words(text).replace(/ /g, '').includes(squashed)) return `names the business "${business}"`;
    const hit = text.match(PITCH_WORDS);
    return hit ? `pitches ("${hit[0]}")` : null;
  };
}
