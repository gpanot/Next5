// server-only — never import from a 'use client' file.
// The photo rules in one place, so they can be tweaked and A/B tested step by step. Each list is joined into the prompt
// as it is: one rule per line, edit a line, bump PHOTO_STYLE_VERSION when PHOTO_STYLE_RULES change, run a test, keep or drop.
//
// History:
// - 2026-09-29: "cinematic light" made photos dark (mean luma 85-140); bright high-key wording gave 164-173.
// - 2026-10-02: no framing rule (an empty top bent scenes) and no brand ban (people held phones flipped).
// - 2026-10-21: photos read busy and "basic AI" (Avenue2 workshop: tools, boards, papers everywhere). A/B on Avenue2 and
//   EQL: a clean composition rule, soft window light and a "real phone photo, portrait mode" look, with the clutter
//   taken out of the plan's scenes, gave clean, real photos at the same or better brightness (luma 128-172).
// - 2026-10-21b: on GPT Image 2.5 (board V5) people stood facing the camera on most slides, and one EQL squat was shot
//   low from the front. Added: candid / no posing, pose and angle change on every slide, flattering body angles (board
//   V6: more side and three-quarter views, squats from the side; GPT still faces the camera often). GPT also split one
//   EQL slide into two panels on its own; the user liked it, so the plan may ask for one split photo per slideshow
//   (vertical or horizontal). Board V6 (GPT) beat V7 (same prompts on Nano); the user wants the variety on about 20%
//   of slides only, the rest simple medium shots.

/** The shared style ending every generated photo's prompt (photos.ts), after the scene and the brand look. */
export const PHOTO_STYLE_RULES = [
  'Bright, well-exposed photograph in soft natural window daylight, gentle contrast, muted true-to-life colors.',
  'Looks like a real photo taken on a good phone in portrait mode, realistic and candid, natural proportions, vertical framing.',
  'Simple, uncluttered composition: one clear subject, a calm tidy background with only a few objects and large plain areas, background softly out of focus (shallow depth of field, 50mm lens), eye-level.',
  'Candid: the person is busy with the action and does not pose or look at the camera; keep the camera angle described.',
  'No text overlays, no watermarks.',
];

/** Bump when PHOTO_STYLE_RULES change, so each photo's record says which wording made it. */
export const PHOTO_STYLE_VERSION = '2026-10-21b';

/** Scene rules for the photo plan (photoPlan.ts): what the planner may put in each photo. */
export const PLAN_SCENE_RULES = [
  'Keep each scene simple: one subject, one action, one calm background. Name at most 2 props, and only ones the action needs.',
  'Never fill the background: no tools, papers, boards, shelves, screens or crowds listed around the person. Never write "scattered", "cluttered" or "busy".',
  'Medium and close shots by default; a wide shot only on the hook, and then with an open, tidy place.',
  'Most slides: a simple medium shot of the person doing the action, side or three-quarter view. About 1 slide in 5 (1 or 2 per slideshow) breaks the pattern with another pose or angle: from behind, over-the-shoulder, hands close-up, seated, crouching or slightly above. The person faces the camera on 2 slides at most.',
  'Flattering body angles: squats, lunges, stretches or bending are shot from the side or three-quarter at chest height, never low from the front or from behind at hip level.',
  'On one slide per slideshow whose text shows two steps or a before and after, the scene may be a split photo: two moments of the same person side by side (vertical split) or one above the other (horizontal split). Write "Split photo, side by side:" or "Split photo, stacked:" first, then both moments.',
];

/** Words that ask the photo model for clutter: a brand look clause holding one is dropped (slideshowStyle.ts). */
export const BUSY_WORDS = /\b(details?|detailed|surroundings|busy|bustling|clutter|cluttered|crowded|messy|scattered)\b/i;

/** The Visual Bible's visual_style rule (shorts/visualBible.ts): the look always stays clean. */
export const LOOK_RULE = 'Always clean and uncluttered: few objects, calm backgrounds, one clear subject';

/** One way to make a photo: a model on a provider (photos.ts runs each). */
export type PhotoEngineStep = 'wavespeed-gpt-2.5' | 'reapi-gpt-2.5' | 'reapi-nano-2.1';

/**
 * Which model makes the slideshow photos (Brand Cast runs and their edits), tried in order until one works.
 * - gpt (default since 2026-10-21, board V5/V6): GPT Image 2.5 Flare made the prompts tidier and brighter (luma 137-183
 *   vs 121-171 on Nano). reAPI first ($0.012), on its official channel with moderation 'low' (the plain channel failed
 *   every call that day; moderation 'auto' rejects gym-wear shots); WaveSpeed only when reAPI fails ($0.039 with a
 *   reference, $0.024 without, at 1k), then Nano.
 * - nano (board V1/V7): Nano Banana 2.1, the most candid photos, but busier and darker. Set SLIDESHOW_PHOTO_ENGINE=nano.
 *   Its safety filter refused about 1 EQL photo in 8 (young women in sportswear); GPT takes those.
 */
export const PHOTO_ENGINES: Record<'gpt' | 'nano', readonly PhotoEngineStep[]> = {
  gpt: ['reapi-gpt-2.5', 'wavespeed-gpt-2.5', 'reapi-nano-2.1'],
  nano: ['reapi-nano-2.1', 'wavespeed-gpt-2.5', 'reapi-gpt-2.5'],
};

/** The engine in use: read per call, so a local or Vercel env change applies without a code change. */
export const photoEngine = (): readonly PhotoEngineStep[] => PHOTO_ENGINES[process.env.SLIDESHOW_PHOTO_ENGINE === 'nano' ? 'nano' : 'gpt'];
