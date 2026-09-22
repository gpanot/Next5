// Locked JSON prompts for Gemini 3 Pro Image, following the portrait-clone method
// (https://github.com/agentara/skills/blob/main/skills/aigc/portrait-clone/SKILL.md):
// every variable gets exactly one value, absences are stated, and the output is always de-slopped
// so the same influencer looks like the same real person, photographed, in every style.

/** A nested JSON object of locked values. */
export type LockedFields = { readonly [key: string]: string | number | LockedFields | readonly string[] };

/**
 * The person, locked once per influencer from their base portrait (see influencers/identityLock.ts).
 * Only identity: face, hair, body, marks. Outfit, pose, scene and camera come from the style.
 */
export type IdentityLock = {
  subject: LockedFields;
  face: LockedFields;
  hair: LockedFields;
  body_marks?: LockedFields;
  hands?: LockedFields;
  /** One `LABEL: imperative` line per trait that differs from the model's default "AI beauty". */
  critical_constraints: readonly string[];
  /** The default-prior version of each of those traits. */
  negative_prompt: readonly string[];
};

/** One style's locked shot: everything except the person. */
export type LockedShot = {
  outfit: LockedFields;
  pose: LockedFields;
  expression: LockedFields;
  scene: LockedFields;
  lighting: LockedFields;
  camera: LockedFields;
  color_grading: LockedFields;
  /** Style-specific drift lines (e.g. `SCENE: no readable text on any sign`). */
  constraints?: readonly string[];
  /** Style-specific absences. */
  negatives?: readonly string[];
};

/** Always present, on every output (De-slop step). */
export const DESLOP_NEGATIVES: readonly string[] = [
  'ultra-detailed, hyper-detailed, 8K, 4K, masterpiece, best quality, ultra-realistic, photorealistic render, sharp focus, crisp, intricate details',
  'oversharpened, high clarity, HDR, high micro-contrast, glowing skin, luminous, radiant, dreamy glow, soft glow bloom',
  'flawless skin, poreless, smooth skin, perfect skin, porcelain, waxy, glossy highlights on skin, airbrushed, retouched, plastic skin',
  'perfect symmetry, perfect teeth, perfect hair, every strand defined, shiny hair highlights',
  'pristine clothing, wrinkle-free fabric, perfectly even background, studio perfection',
  'stock photo, advertising photo, magazine cover, professional retouching, beauty campaign',
  'idol face, doll face, V-line jaw, oversized eyes, model pose, glamour look',
  'second person, extra people in focus, text, captions, logos, watermark, readable signs, brand names',
  'extra fingers, missing fingers, fused fingers, deformed hands, extra arms',
  'illustration, 3D render, CGI, painting, cartoon, anime',
];

const IDENTITY_CONSTRAINT =
  'IDENTITY: the person is the exact same individual as in reference image 1 — same face geometry, eye shape, nose, lips, skin tone, moles, hairline and hair color; do not beautify, slim, age or de-age them';
const MEDIUM_CONSTRAINT =
  'MEDIUM: must read as an unretouched real photograph from a full-frame mirrorless camera, never as a render or a retouched photo';
const ASPECT_CONSTRAINT = 'FRAME: vertical 9:16 portrait composition, subject fills the frame as described in camera';

const POST_PROCESSING = {
  step_1: '1.5% monochrome luminance grain across the whole frame',
  step_2: 'downscale to 75% bilinear, then upscale back to full size',
  step_3: 're-export as JPEG quality 88',
} as const;

/** Fallback when an influencer has no identity lock yet: the reference image carries the identity. */
export const REFERENCE_ONLY_IDENTITY: IdentityLock = {
  subject: { count: 1, identity_source: 'reference image 1 — copy the person exactly', apparent_age: 'same as reference image 1' },
  face: { geometry: 'identical to reference image 1', skin: 'same tone, undertone, pores, moles and freckles as reference image 1, visible pores on nose and cheeks' },
  hair: { style: 'identical color, length, part and texture to reference image 1', imperfections: '4 to 6 flyaway strands at the crown, slight clumping at the ends' },
  critical_constraints: [],
  negative_prompt: ['different person, changed face, face swap artifacts, altered eye shape, altered nose, lighter or darker skin tone than reference'],
};

type ComposeInput = {
  /** snake_case id, e.g. `anna_law_office`. */
  id: string;
  identity: IdentityLock | null;
  shot: LockedShot;
  /** True when a reference image is attached (image-to-image). */
  withReference: boolean;
};

/** Builds the locked JSON prompt. Key order follows the portrait-clone schema. */
export const composeLockedPrompt = ({ id, identity, shot, withReference }: ComposeInput): string => {
  const person = identity ?? REFERENCE_ONLY_IDENTITY;
  const prompt = {
    prompt_id: `${id}_locked_v1`,
    prompt_language: 'en',
    critical_constraints: [
      ...(withReference ? [IDENTITY_CONSTRAINT] : []),
      ...person.critical_constraints,
      ...(shot.constraints ?? []),
      ASPECT_CONSTRAINT,
      MEDIUM_CONSTRAINT,
    ],
    negative_prompt: [...DESLOP_NEGATIVES, ...person.negative_prompt, ...(shot.negatives ?? [])],
    subject: person.subject,
    face: person.face,
    hair: person.hair,
    hands: person.hands ?? { nails: 'short, natural, unpolished, 2 mm past fingertip', rings: 'none' },
    body_marks: person.body_marks ?? { tattoos: 'none', scars: 'none' },
    accessories: { glasses: 'none', headwear: 'none', bag: 'none', other: 'none' },
    outfit: shot.outfit,
    pose: shot.pose,
    expression: shot.expression,
    scene: shot.scene,
    lighting: shot.lighting,
    camera: shot.camera,
    color_grading: shot.color_grading,
    style: {
      medium: 'real photograph: full-frame mirrorless camera still',
      realism: 'unretouched, unpolished, true-to-life, no idealization',
      imperfections: 'visible pores on nose and cheeks, faint redness at nostrils, slight under-eye shadow, 2 to 3 fabric creases at elbows and waist, 4 to 6 flyaway hairs at crown, faint sensor noise in shadows',
    },
    output: { aspect_ratio: '9:16', orientation: 'portrait', num_images: 1 },
    generation_params: {
      reference_image: withReference ? 'reference image 1 = identity only (face, hair, skin, body); ignore its clothing, pose, background and lighting' : 'none',
      note_to_model: 'critical_constraints override any default beauty or quality bias. Follow every field literally; do not add, remove, beautify, sharpen or reinterpret any attribute. Anything not described does not exist in the image.',
    },
    post_processing: POST_PROCESSING,
  };
  return JSON.stringify(prompt);
};
