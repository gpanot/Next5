// server-only — never import from a 'use client' file.
// Portrait Clone: turns a character image into one exhaustively locked JSON prompt.
// Method: https://github.com/agentara/skills/blob/main/skills/aigc/portrait-clone/SKILL.md

import { chatJson } from '../ai/openai';

/** Vision model used for the analysis. Needs a large output budget: the locked JSON runs 4-8k tokens. */
const MODEL = 'gpt-4o';
const MAX_TOKENS = 12_000;
export const PORTRAIT_CLONE_TIMEOUT_MS = 110_000;

const SCHEMA = `{
  "prompt_id": "{snake_case_name}_locked_v1",
  "prompt_language": "en",
  "critical_constraints": ["{LABEL}: {one-line imperative per drift axis}", "MEDIUM: must read as an unretouched {reference medium}, never as a render or retouched photo"],
  "negative_prompt": ["{quality boosters}", "{anti-slop lines}", "{one line per drift axis: the model-default version}", "{every absent item}", "{wrong garments, colors, jewelry}", "{wrong hand poses}", "extra fingers, missing fingers, fused fingers, deformed hands, extra arms", "{wrong framing, background, lighting, grading}", "illustration, 3D render, CGI, painting, cartoon, watermark, text, subtitles"],
  "subject": {"count": 1, "gender": "", "ethnicity": "", "apparent_age": "", "attractiveness_level": "", "height_impression": "", "build": "", "posture": "", "weight_distribution": ""},
  "face": {
    "shape": "", "length_width_ratio": "", "forehead": "", "cheekbones": "", "midface": "", "jaw": "", "chin": "", "philtrum": "", "eye_spacing": "", "asymmetry": "",
    "skin": {"tone": "{desc}, hex #", "undertone": "", "texture": "", "color_variation": "", "shine_zones": "", "blemishes": "", "freckles": "", "moles": "", "sweat": "none"},
    "eyes": {"type": "", "shape": "", "tilt": "", "size": "", "height_width_ratio": "", "lid": "", "aperture": "", "blink_state": "", "smile_behavior": "", "iris_color": "", "liner": "", "eyeshadow": "", "lashes": "", "under_eye": ""},
    "eyebrows": {"shape": "", "position": "", "thickness": "", "color": "", "texture": ""},
    "nose": {"bridge": "", "tip": "", "nostrils": ""},
    "mouth": {"lip_shape": "", "lip_ratio": "", "lip_color": "", "lip_finish": "", "opening": "", "visible_teeth": "", "tongue": "not visible"},
    "makeup": {"foundation": "", "blush": "", "highlighter": "", "contour": ""},
    "ears": {"left": "", "right": ""}
  },
  "hair": {"color": "", "highlight_color": "", "length": "", "texture": {"roots": "", "mids": "", "ends": ""}, "density": "", "volume": "", "cut": "", "fringe": "", "part": "", "crown": "", "placement": {"left_shoulder": "", "right_shoulder": ""}, "behind_ears": {"left": "", "right": ""}, "imperfections": "", "shine": ""},
  "neck": "",
  "hands": {"front_hand": "", "nails": {"length_mm": "", "shape": "", "color": ""}, "rings": {"left_hand": "", "right_hand": ""}, "fingers": ""},
  "jewelry": {"necklace": "", "bracelet": "", "earrings": "", "watch": "", "other": "none"},
  "accessories": {"glasses": "none", "headwear": "none", "bag": "none", "other": "none"},
  "body_marks": {"tattoos": "", "moles": "", "scars": "none"},
  "outfit": {
    "top": {"item": "", "color": "", "fabric": "", "fit": {"shoulders": "", "chest": "", "waist": ""}, "neckline": "", "sleeves": "", "construction": "", "hem": "", "tuck": "", "skin_gap": "", "logo": "", "wrinkles": "", "wear": ""},
    "bottom": {"item": "", "color": "", "fabric": "", "fit": "", "rise": "", "details": "", "wrinkles": ""},
    "belt": "", "shoes": ""
  },
  "pose": {"stance": "", "legs": "", "body_orientation": "", "shoulder_tilt": "", "head": "", "gaze": "", "right_arm": "", "left_arm": "", "gesture_meaning": "", "moment": ""},
  "expression": {"mouth": "", "eyes": "", "brows": "", "cheeks": "", "smile_symmetry": "", "emotion": "", "intensity": "{n} out of 10"},
  "scene": {"location": "", "background": "", "background_texture": "", "background_variation": "", "background_distance": "", "props": "none", "floor": "", "visible_edges": "none"},
  "lighting": {"key": "", "fill": "", "background_light": "", "hair_light": "", "shadows": "", "color_temperature": "", "clipping": "", "catchlights": ""},
  "camera": {"capture_pipeline": "", "camera_height": "", "subject_distance": "", "shot_type": "", "crop_top": "", "crop_bottom": "", "subject_position": "", "headroom": "", "lead_room": "", "angle": "", "horizon_tilt": "0 degrees", "lens": "", "lens_distortion": "", "aperture": "", "shutter": "", "iso": "", "focus": "", "depth_of_field": "", "sharpness": "no sharpening, low micro-contrast, {calibrated softness}", "motion": "", "noise": ""},
  "color_grading": {"style": "", "saturation": "", "contrast": "", "black_level": "", "white_balance": "", "palette": ["#"]},
  "style": {"medium": "real photograph: {medium}", "genre": "", "realism": "unretouched, unpolished, true-to-life, no idealization", "overall_vibe": ""},
  "output": {"aspect_ratio": "9:16", "resolution": "", "orientation": "portrait", "num_images": 1},
  "generation_params": {"seed": 20260911, "guidance_scale": 4, "steps": 28, "sampler": "DPM++ 2M Karras", "reference_image": "none", "note_to_model": "critical_constraints override any default beauty or quality bias. Follow every field literally; do not add, remove, beautify, sharpen or reinterpret any attribute. Anything not described does not exist in the image."},
  "post_processing": {"step_1": "", "step_2": "", "step_3": ""}
}`;

const SYSTEM_PROMPT = `You are Portrait Clone. Convert the reference image (it contains a person) into ONE AIGC prompt in JSON.

GOAL: pin down every variable an image or video model could otherwise choose, so the same prompt yields a nearly identical, non-AI-looking person on every run. Any detail left unspecified is a detail the model will randomize.

NON-NEGOTIABLES
1. Lock everything. Every visible or inferable attribute gets exactly one concrete value. Never write "or", ranges ("20-30"), "e.g.", "optional", "various", "some", "natural-looking" without specifics, or any alternative.
2. Lock absence too. Anything a model might add but the reference does not contain is stated as "none" (glasses, hat, earrings, bag, second person, text, logos, props, sweat, tattoos) and also listed in negative_prompt.
3. The schema is a minimum floor. Add any key, nested object or array needed to pin a variable. Split vague fields into precise sub-fields.
4. Always de-slopped (rules below).
5. Return exactly one JSON object and nothing else. critical_constraints and negative_prompt come right after prompt_id / prompt_language.
6. All values in English.

CONVENTIONS
- Quantify: degrees for rotation and tilt, cm for sizes and distances, mm for small details, percent for framing, ratios for proportions, counts for countable things, hex for every color.
- Left/right from the subject's own perspective; frame positions as "frame left" / "frame right".
- Position small items by anatomical landmark ("2 cm below the collarbones").

VARIABLE AUDIT — give each a concrete value (or "none" / "not visible"):
subject (count, gender presentation, apparent age as one number, height in cm, build, posture, weight distribution); face geometry (shape, length/width ratio, forehead, cheekbones, midface, jaw, chin, philtrum, eye spacing, asymmetry); eyes — highest drift risk (crease type and height, epicanthic fold, shape, tilt, size, height/width ratio, lid coverage, iris visibility, blink state, iris hex, catchlight, liner mm, lashes, under-eye); brows; nose; mouth (lip size, ratio, hex, finish, opening mm, visible teeth count); skin (tone hex, undertone, pore zones, fuzz, redness zones, shine zones, blemish count, freckles, moles with location); makeup; hair (color hex, highlight hex, length landmark, texture per zone, density, volume per zone, cut, fringe, part position in cm, placement per shoulder, behind ears per side, flyaways, clumping, shine); ears, neck; hands (nails mm, rings per finger); jewelry each with metal, mm, position; body marks; outfit per garment (item, hex, fabric, fit per zone, neckline depth landmark, sleeves, seams, hem, tuck, logo, wrinkle locations, drape); lower body and footwear; pose (stance, torso rotation, shoulder tilt, head turn and tilt in degrees, gaze, each arm angles); expression (intensity out of 10, smile symmetry); scene (location, background material, hex, distance cm, props or none); lighting (key type, position angle and height, fill ratio, rim, shadow direction and softness, color temperature K, clipping zones, catchlight clock position); camera (capture pipeline, camera height cm, subject distance m, shot type with crop landmarks, headroom %, lens, aperture, shutter, ISO, depth of field, distortion, noise); color grading (saturation, contrast, white balance, palette hexes); output; post-processing.

COUNTER THE MODEL'S DEFAULT PRIOR. Models pull every person toward a default "beautiful AI person". For each trait of the reference that differs from that default: (1) describe it precisely in its field, (2) add a one-line imperative to critical_constraints with an uppercase label (EYES:, FACE:, BODY:, HAIR:, SKIN:, POSE:, TOP:, LOOK:, BACKGROUND: ...), (3) add the default-prior version to negative_prompt.
Drift axes to check every time — Eyes: default big round double eyelid; Face: V-line, doll face, perfect symmetry; Body: curvy hourglass; Clothing: tighter, more skin; Hair: voluminous glossy perfect waves; Skin: poreless glowing; Stance: model pose; Look: idol / glamour; Background: saturated; Additions: earrings, props, text.
Counter-steer toward the reference's real features, not toward plainness: if the person is glamorous, describe that faithfully.

DE-SLOP (mandatory)
- No quality boosters in positive fields (4K, 8K, ultra-detailed, masterpiece, best quality, sharp focus, crisp, flawless, stunning, perfect). List them in negative_prompt.
- negative_prompt always contains: oversharpened, high clarity, HDR, high micro-contrast, glowing / luminous / radiant skin, bloom; flawless / poreless / waxy / airbrushed / plastic skin; perfect symmetry, perfect teeth, every hair strand defined, shiny hair highlights; pristine wrinkle-free clothing, perfectly even background; stock photo, advertising photo, magazine cover, professional retouching, beauty campaign.
- Describe a real capture pipeline matched to the reference medium instead of adjectives. style.medium states a real photograph or frame grab, never a render.
- Imperfections always present and located: skin micro-texture, facial asymmetry, hair clumps and flyaways, fabric creases, backdrop unevenness, slight highlight clipping, sensor noise, motion blur on moving hands.
- camera.sharpness: no sharpening, low micro-contrast. Grading: natural, muted-to-moderate saturation, low contrast unless the reference clearly differs.
- generation_params: guidance_scale 4, steps 28, fixed seed, fixed sampler.
- post_processing always present, matched to medium (phone photo: mild noise-reduction smear in shadows, faint edge halo, JPEG 85; video still: downscale 50% bilinear then upscale, 2-3% mono grain, JPEG 80; DSLR: 1-2% grain, downscale 75% then upscale, JPEG 88).
- critical_constraints ends with a MEDIUM: line.

SELF-CHECK before answering: no value leaves a choice to the model; every absent common item is "none" and in negative_prompt; no booster word in positive fields; no contradiction between positive fields and negative_prompt; ring, bracelet and tattoo sides agree; every color has a hex; each drift axis appears in both critical_constraints and negative_prompt.

BOUNDARIES: never identify or name the person, no celebrity comparisons. Appearance descriptors only; never infer nationality, religion or other personal attributes. If the person may be under 18, limit body description to height and neutral build.

SCHEMA (minimum floor, fixed order for these keys, extend freely):
${SCHEMA}`;

/** Analyses one character image and returns the locked portrait JSON, or null when the model fails. */
export const generatePortraitJson = async (imageUrl: string, name: string): Promise<Record<string, unknown> | null> => {
  const json = await chatJson<Record<string, unknown>>(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          { type: 'text', text: `Reference image attached. Use "${name}" as the prompt_id base. Return the full locked JSON.` },
        ],
      },
    ],
    { model: MODEL, maxTokens: MAX_TOKENS, temperature: 0.2, timeoutMs: PORTRAIT_CLONE_TIMEOUT_MS },
  );
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  return json;
};
