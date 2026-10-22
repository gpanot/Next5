// server-only — never import from a 'use client' file.
// The photo prompt formula (user, 2026-10-22): some Nano Banana photos were weak with free-form prompts, so both shot
// planners (visuals.ts, storyboard.ts) write the image prompt as one fixed structure of lighting, framing and textures.

/** How the shot planner must write `image_prompt`. Our house rules (bright daylight, calm lower third) fill the slots. */
export const PHOTO_FORMULA = `IMAGE PROMPT FORMULA (write image_prompt as exactly these parts, in this order, as plain sentences):
  1. [Subject and action] in [specific setting].
  2. Lit by [source, direction and softness], creating [shadow and highlight behavior].
     Source = bright natural daylight (window, open shade or overcast sky), never night, dusk or studio flash.
  3. Framed as [shot size and camera position] with [depth-of-field behavior].
     The subject sits centered or slightly above center; the lower third stays calm (name what fills it).
  4. Preserve [two or three material, skin, fabric or product textures].
  5. [Color palette and emotional tone].
  6. Natural imperfections, believable background geometry, no unwanted text or logos.
Example: A woman in her thirties pours detergent into a cap in a small laundry room. Lit by soft window daylight from the
left, creating gentle shadows and a bright highlight on the plastic bottle. Framed as a medium shot at eye level with a
softly blurred background. Preserve the cotton weave of her sweater, visible skin pores and the matte plastic of the bottle.
Clean whites and warm neutrals, calm and practical. Natural imperfections, believable background geometry, no unwanted
text or logos.`;

/** What a clip's `motion_action` may be (the clip is 4-6 s from one photo; Veo adds artifacts on fine detail). */
export const MOTION_ACTION_RULES = `  - ONE big, simple movement a viewer sees clearly from THIS camera angle: walk, turn, stand up, open a door, lift, nod.
  - Never fine hand-object contact (buckles, handles, laces, zippers, small buttons, typing), never an action behind glass
    or inside a car seen from outside, never two things moving at once.
  - No new object, person or part of the car that is not already in the photo.
  - 8-16 words, real-life speed, never "slowly", "gently" or "in slow motion".`;
