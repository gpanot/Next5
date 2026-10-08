// server-only — never import from a 'use client' file.
// Next5 content guidelines (next5-content-guidelines.md, 2026-10-08), the Shorts part: every short teaches, it never sells.
// The script writer, the shot planner and the voice caster all read from here so the rules live in one place.

import type { ShortInputs } from '../../types/admin/shorts';

/**
 * The structures a short body may take: one per video. `belief_then_reveal` comes first and is the default: it is the
 * shape of the reels-af reel the user found catchier than our 3-point list (2026-10-08): a common belief, one named
 * source, the one signal, why it works, a callback close.
 */
export const BODY_STRUCTURES = ['belief_then_reveal', 'mistake_then_fix', 'story', 'steps', 'numbered_list'] as const;

/** Offer and urgency phrases that turn a lesson into an ad. A script containing one is rejected and rewritten. */
export const BANNED_PHRASES =
  /\b(buy now|shop now|order now|dm me|link in bio|limited[- ]time|act now|don'?t miss|hurry|sign up( today| now)?|book a (demo|call)|start (your )?free trial|try it (free|today)|discount|coupon|promo code|\d+% off|on sale|best in the|#1)\b/i;

/** The education rules for the script writer, with the brand filled in. */
export const educationBlock = (inputs: ShortInputs): string => `──── NEXT5 CONTENT RULES: EDUCATION, NEVER AN AD ────
You write for ${inputs.brandName} (${inputs.domain}). Audience: ${inputs.audience}.
The short is EDUCATION (or edutainment). It is never an advertisement. The business is the teacher, not the seller.

GOAL: after watching, the viewer can do or decide something differently. If the lesson disappears when you remove the
product, it is an ad: rewrite it.
TOPIC: one idea only, something a future customer of ${inputs.brandName} would search for. The product may appear only as
the example inside the lesson, never as the point.
HOOK: under 12 words, says what the video answers. Either a clear outcome ("The one sign a lead is ready to buy") or a
question naming the viewer's pain in their own words ("Why do some leads reply in minutes while others ghost you?").
No curiosity bait that hides the topic ("you won't believe", "the secret", "wait for it", "this changed everything").
Write like people talk out loud: short, warm, a little punchy. No corporate words (prioritize, leverage, solution,
GTM, outbound motion, ICP) unless you explain them.
ONE TAKEAWAY: the whole video lands on exactly ONE sharp insight the viewer can use today (one signal, one fix, one
rule). Not a list of tips. Every line serves that one insight.
PROOF: one real, named source from SOURCE makes the insight believable: a named customer and its result, a number the
business publishes, its track record. Name it ("KubaLabs booked 5 demos from 30 leads"). Never invent a study, a
researcher, a year or a number; if SOURCE has no proof, skip it.
STRANGER RULE: the viewer has never seen this business. Say who is talking and why to listen. Explain any jargon in plain
words the first time ("intent signal, a sign someone is shopping right now").
BODY: pick ONE structure. Use belief_then_reveal, also for "how to" topics ("how to spot a ready lead" = most people
look at X, the real signal is Y). Use another structure only when the lesson is a physical procedure or a real case:
  - belief_then_reveal: what most people think ("Most founders think more emails means more meetings.") → the named
    proof → the one signal or rule that is really true → why it works, in plain words.
  - mistake_then_fix: the common mistake → what it costs → the one fix → why it works.
  - story: situation → problem → what they did → result → the lesson.
  - steps or numbered_list: only for a physical procedure (fix, install, style), at most 3 points.
Every line is concrete: a number, a name, an example. No filler adjectives.
CLOSE: one sentence that restates the takeaway and echoes a word from the hook, so the video loops. Allowed call to action: "save this for later", "follow for part 2", or a question that
invites comments. An identity line is fine ("That's ${inputs.brandName}: we help ..."). No offer.
BANNED: prices as a pitch, discounts, urgency, "buy now", "DM me", "link in bio", "sign up", "book a demo", free trials,
superlatives without proof ("the best"), feature walkthroughs, slogans.`;

/** The look rules for every photo prompt (documentary, teaching), and what must never show up. */
export const VISUAL_RULES = `The photo explains the lesson: show the subject being explained, in a real place, with a natural documentary look
(real rooms, daylight, phone-camera framing, slight imperfection). When a person is in frame, they are teaching or doing
the thing: pointing at, holding or working on the subject, not posing. Never a studio product hero shot, pedestal,
glossy studio lighting, advertisement or commercial look, promotional banner, price text or discount badge.`;
