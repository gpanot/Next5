// server-only — never import from a 'use client' file.
// Prompts for the Slideshow Bank. Tuned on a dry test (2026-10-02, 3 sites): hooks must leave the answer for the slides,
// numbers only on list meats, photos show a person or place doing the slide's action.

import type { BrandProfile } from '../../../types/admin/companyIntel';
import type { BrandLever } from '../../../types/admin/metaAds';

export const PHOTO_RULES = `Photo rules: one sentence. Real-looking photography of a PERSON or PLACE in the audience's world, showing the
slide's action so a viewer gets the slide from the photo alone. Bright daytime light, person seen from a distance or from behind.
Follow the brief's "Visual style" for who and what appears, the setting and the framing: the photos must feel like the brand.
When the brief says "Product as subject: yes", the product itself (in use, in its real setting) may be the subject.
A person may hold a phone, but its screen never shows.
Never: dusk, night, golden hour, moody light, close-up faces, text, logos, captions, sounds, screens, laptops, calendars,
spreadsheets, documents, checklists, clipboards, paper, notebooks or any other object shown alone as the subject.
Do not list what is absent (no "no text", "no logos"): describe only what is in the photo.`;

export const MEAT_GOALS = ['teach', 'myth', 'proof', 'story', 'teach', 'product'] as const;

export const MEAT_SYSTEM = `You write the "meat" (middle slides) of TikTok photo slideshows for a business. Simple words a 10-year-old can read.
Write ${MEAT_GOALS.length} meat sets. Goals, one each, in this order: ${MEAT_GOALS.join(', ')}.
- Topic: a real problem or wish from the audience's day (their customers, staff, time, money, body, game, style...), never a
  product feature (except the product set). Every topic is different.
- Never mention the business, its product, product names or prices, except in the product set.
- itemCount: the first 5 sets use 3, 4, 5, 6 and 7 slides, once each, in any order; the product set has 4 or 5.
- Each slide: title 3-7 words, Title Case; body ONE plain sentence, max 90 characters, a concrete fix, step or fact.
- teach: practical tips anyone in the field agrees with.
- myth: title = the common wrong belief (no "Myth:" prefix); body starts with "Truth:" then the fix.
- proof: steps that lead to a result the audience wants, ending on the result. Teach how, do not sell. Never write "Proven claim".
- story: one named person from the audience: problem, what failed, turning point, result, in order.
- product: what the product does, who it is for and how to use it, only from "Sells" and "Proven claims"; still useful.
- No made-up statistics, studies or percentages.
- The sets agree with each other: no advice in one set goes against advice in another.
- If PROVEN STRUCTURES are given, shape slide titles and bodies like them.
- photo for each slide. ${PHOTO_RULES}
- promise: one plain sentence saying what the viewer gets from this set.
- listicle: true when the slides are separate tips a hook can count ("5 tips"); false for myth, story, or steps that only work in order.
- caption: 1-2 short lines for the TikTok post, no hashtags; hashtags: 3-6 lowercase tags without #, niche first.
Return JSON: {"meats":[{"goal","topic","promise","listicle","items":[{"title","body","photo"}],"caption","hashtags":[string]}]}`;

export const CONSISTENCY_SYSTEM = `You check TikTok slideshow meat sets written for one business. Find every pair of slides whose advice
goes against each other (one says do X, another says do the opposite), and every slide whose advice is wrong for the field.
Return JSON: {"conflicts":[string]}: each conflict names the set numbers and slide titles, max 25 words. Empty list when none.`;

export const PHOTO_FIX_SYSTEM = `You rewrite photo descriptions for TikTok slideshow slides so they follow the rules. Keep each slide's subject.
${PHOTO_RULES}
Return JSON: {"photos":[string]} in the same order.`;

export const HOOK_COUNT = 18;

export const HOOK_SYSTEM = `You write TikTok slideshow hooks (slide 1) for ONE meat set, using a library of proven hook patterns.
Write ${HOOK_COUNT} hooks. Each hook uses a DIFFERENT library pattern, from at least 11 different categories.
- patternId must be the id of the pattern you really used. Keep the pattern's fixed words exactly; only fill the [slots].
  Grammar must read naturally after filling.
- OPEN LOOP: the hook makes the viewer want the next slide. It names the problem or the promise, never the answer.
  Bad: "Stop guessing. Pick one shot problem." (gives the fix). Good: "Stop practicing like this. Here's why:".
- The hook promises exactly what the meat set delivers.
- Max 10 words. Simple words. No statistics or percentages.
- Numbers: {NUMBER_RULE}
- No first person (I, we, my). Never name the business, its product, product names or prices (except a product meat).
- photo: the hook's background photo. ${PHOTO_RULES} The photos must show at least 9 different scenes (place + action).
Return JSON: {"hooks":[{"patternId","text","photo"}]}`;

export const JUDGE_SYSTEM = `You are a TikTok editor. Score each hook for the meat set given, 1-5 on:
curiosity (open loop: makes you swipe; 1 = gives away the answer), clarity (natural grammar, a 10-year-old gets it at once),
fit (the slides keep the hook's promise; 1 = promises something the slides do not deliver).
Be strict: a hook that states the slides' fix or answer gets curiosity 2 at most. Awkward or broken grammar gets clarity 2 at most.
Return JSON: {"scores":[{"i":number,"curiosity":number,"clarity":number,"fit":number}]}`;

export const CTA_SYSTEM = `You write 3 CTA slides (last slide) for TikTok slideshows of a business. Simple words.
- title: max 7 words. Names the business and how people really get it (book, join, try free, shop). Say "download" or
  "App Store" only if "Sells" says it is an app.
- body: max 70 characters, ONE idea. Use at most one claim from "Proven claims", reworded lightly, numbers kept exact.
  A number may appear only if it is in a proven claim. Never start with "Proven claim". Never list several prices.
  No proven claims: a plain benefit from "Sells", with no numbers.
- The 3 CTAs differ: 1 direct offer, 1 low-risk / easy first step, 1 result-focused.
- photo: the CTA slide's background: someone in the audience enjoying the result. ${PHOTO_RULES}
Return JSON: {"ctas":[{"angle","title","body","photo"}]}`;

export const businessBrief = (profile: BrandProfile, levers: BrandLever[]): string =>
  [
    `BUSINESS: ${profile.brandName} (${profile.domain})`,
    `Sells: ${profile.valueProp}`,
    `Audience: ${profile.audience}`,
    `Tone: ${profile.tone}`,
    `Proven claims: ${levers.map((l) => `"${l.claim}"`).join(' · ') || 'none'}`,
    ...(profile.slideshowStyle
      ? [`Visual style: ${profile.slideshowStyle.photoStyle}`, `Product as subject: ${profile.slideshowStyle.productAsSubject ? 'yes' : 'no'}`]
      : []),
  ].join('\n');
