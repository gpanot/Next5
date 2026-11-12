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

/**
 * How `motion_action` is written (user, 2026-10-22). The clip starts FROM the photo, so the prompt only says what happens
 * next, never what the photo shows. Since it no longer repeats the photo, it can be precise: 50-80 words of exact motion.
 */
export const MOTION_ACTION_RULES = `MOTION ACTION (the clip starts from this photo, so never describe what the photo shows; say only what happens NEXT):
  - 50-80 words, real-life speed (never "slowly", "gently", "in slow motion"), in the order it happens over the 4-6 seconds.
  - Be precise: which body part moves, in which direction, in what order, how far (the left hand grips the door edge and
    pulls it outward; she turns her shoulders toward the seat and lowers herself in).
  - Cover three layers: (1) the main action of the subject, step by step; (2) the subject's secondary motion (head and
    eye direction, blinking, breathing, weight shift, fabric and hair following the body); (3) the surroundings (leaves,
    grass, passing light and shadow, distant traffic, reflections moving on the bodywork).
  - Say how the camera move interacts with the action when it matters (the push in tightens on her face as she sits).
  - Refer to people and objects by role ("the woman", "the car"), never by appearance, outfit or brand.
  - Choose actions a viewer can see from THIS camera angle. Use only people and objects already in the photo: nothing
    new appears, nothing is picked up that is not in frame.`;
