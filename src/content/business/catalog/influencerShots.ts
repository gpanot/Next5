/**
 * One locked shot per Brand style for influencer variations (portrait-clone method: one value per variable).
 * Outfits are written to suit any gender. The person comes from the influencer's identity lock, not from here.
 */

import type { LockedFields, LockedShot } from '../../../server/generation/composer/portraitClone';

type Framing = 'close' | 'half' | 'three_quarter';

type ShotSpec = {
  outfit: LockedFields;
  pose: string;
  expression: string;
  /** location, background, props (use "none" for none). */
  scene: [string, string, string];
  /** key light, fill, color temperature. */
  lighting: [string, string, string];
  framing: Framing;
  aperture: string;
  constraints?: readonly string[];
  negatives?: readonly string[];
};

const FRAMING: Record<Framing, LockedFields> = {
  close: { shot_type: 'close-up portrait', crop_top: '6% headroom above hair', crop_bottom: 'mid-chest', subject_distance: '1.2 m', lens: '85 mm prime' },
  half: { shot_type: 'medium shot', crop_top: '8% headroom above hair', crop_bottom: 'just below the waist', subject_distance: '2.0 m', lens: '50 mm prime' },
  three_quarter: { shot_type: 'three-quarter shot', crop_top: '7% headroom above hair', crop_bottom: 'mid-thigh', subject_distance: '2.8 m', lens: '50 mm prime' },
};

const camera = (framing: Framing, aperture: string): LockedFields => ({
  capture_pipeline: 'full-frame mirrorless body, 1/250 s, ISO 400, standard picture profile, JPEG',
  ...FRAMING[framing],
  aperture,
  camera_height: '150 cm, level with the chest',
  subject_position: 'centered horizontally, eyes on the upper third line',
  horizon_tilt: '0 degrees',
  lens_distortion: 'none',
  focus: 'focus plane on the nearer eye',
  depth_of_field: aperture === 'f/2.0' ? 'shallow, background softly blurred' : 'moderate, background recognizable but soft',
  sharpness: 'no sharpening, low micro-contrast, slight natural softness',
  noise: 'faint luminance noise in the shadows',
});

const GRADING: LockedFields = {
  style: 'natural, neutral grade',
  saturation: 'moderate, 10% below camera default',
  contrast: 'low',
  black_level: 'slightly lifted, #141414',
};

const build = (spec: ShotSpec): LockedShot => ({
  outfit: spec.outfit,
  pose: { description: spec.pose, gaze: 'into the lens unless stated otherwise' },
  expression: { description: spec.expression, smile_symmetry: 'slightly asymmetric, natural', intensity: '6 out of 10' },
  scene: { location: spec.scene[0], background: spec.scene[1], props: spec.scene[2], other_people: 'none in focus', visible_text: 'none' },
  lighting: { key: spec.lighting[0], fill: spec.lighting[1], color_temperature: spec.lighting[2], clipping: 'slight highlight clipping on the brightest window or lamp only' },
  camera: camera(spec.framing, spec.aperture),
  color_grading: { ...GRADING, white_balance: spec.lighting[2] },
  constraints: spec.constraints,
  negatives: spec.negatives,
});

const NAVY_BLAZER: LockedFields = {
  top: 'tailored single-breasted navy wool blazer #1F2A44 over a plain white crew-neck top #F4F2EE, shallow creases at the inner elbows',
  bottom: 'charcoal tailored trousers #3A3A3C',
  jewelry: 'none', watch: 'thin silver watch on the left wrist',
};
const KNIT: LockedFields = {
  top: 'fine-knit crew-neck sweater in oatmeal #D8CBB5, sleeves pushed to mid-forearm, soft pilling at the cuffs',
  bottom: 'dark indigo straight jeans #2B3446',
  jewelry: 'none', watch: 'none',
};

const SPECS: Readonly<Record<string, ShotSpec>> = {
  'modern-office': { outfit: NAVY_BLAZER, pose: 'standing beside a glass meeting-room wall, torso turned 20 degrees to frame left, arms loosely crossed at the waist', expression: 'confident closed-mouth smile', scene: ['bright modern office', 'glass wall, light oak desks, city skyline blurred through windows', 'none'], lighting: ['large window at frame left, 45 degrees, soft', 'white walls bouncing fill, ratio 1:2', 'daylight 5600 K'], framing: 'half', aperture: 'f/2.0' },
  'listing-interior': { outfit: KNIT, pose: 'standing by a white marble kitchen island, left hand resting flat on the counter, weight on the right leg', expression: 'warm open smile showing 6 upper teeth', scene: ['staged luxury home kitchen', 'white marble island, pendant lights, light oak cabinets', 'none'], lighting: ['tall windows at frame right, soft afternoon light', 'bounce from marble, ratio 1:2', 'daylight 5400 K'], framing: 'three_quarter', aperture: 'f/2.8' },
  'neighborhood-cafe': { outfit: KNIT, pose: 'seated at a small window table, both hands around a ceramic coffee cup at chest height, shoulders relaxed', expression: 'soft relaxed smile', scene: ['neighborhood café', 'warm wood, plants, café interior blurred', 'one matte white ceramic cup, a closed laptop'], lighting: ['window at frame left, warm morning light', 'room ambient fill, ratio 1:3', 'warm daylight 4800 K'], framing: 'half', aperture: 'f/2.0' },
  'studio-backdrop': { outfit: NAVY_BLAZER, pose: 'standing square to the camera, shoulders level, arms relaxed at the sides', expression: 'calm closed-mouth smile', scene: ['photo studio', 'seamless warm grey paper backdrop #8C8A86 with a faint gradient', 'none'], lighting: ['large softbox at frame left, 45 degrees, 1 m from subject', 'white reflector at frame right, ratio 1:2', 'neutral 5500 K'], framing: 'close', aperture: 'f/4.0' },
  'urban-outdoor': { outfit: { ...KNIT, outerwear: 'camel wool overcoat #B08D63, open' }, pose: 'walking toward the camera mid-stride on a city sidewalk, right hand in the coat pocket', expression: 'easy natural smile, looking just past the lens', scene: ['modern city sidewalk', 'glass and concrete façades, blurred', 'none'], lighting: ['low golden-hour sun at frame right, side light', 'open sky fill, ratio 1:3', 'warm 4200 K'], framing: 'three_quarter', aperture: 'f/2.0' },
  'home-office': { outfit: KNIT, pose: 'seated at a tidy desk, turned 30 degrees toward the camera, forearms resting on the desk', expression: 'friendly closed-mouth smile', scene: ['home office', 'bookshelves and green plants behind, blurred', 'open laptop, one ceramic mug'], lighting: ['window at frame left, soft', 'room fill, ratio 1:2', 'daylight 5200 K'], framing: 'half', aperture: 'f/2.0' },
  'executive-suite': { outfit: { ...NAVY_BLAZER, top: 'tailored charcoal wool suit jacket #34363A over a pale blue collared shirt #C9D6E3, top button open' }, pose: 'standing at the corner-office window, body turned 30 degrees to frame right, head turned back to the lens', expression: 'composed confident half smile', scene: ['corner executive office', 'walnut desk, leather chair, city skyline blurred', 'none'], lighting: ['overcast window light from frame right', 'bounce from desk, ratio 1:2', 'daylight 6000 K'], framing: 'half', aperture: 'f/2.8' },
  'open-house': { outfit: { ...KNIT, outerwear: 'unstructured sand linen blazer #CDBFA6' }, pose: 'standing on a front porch beside an open navy front door, right arm extended toward the doorway in a welcoming gesture', expression: 'warm welcoming smile showing 6 upper teeth', scene: ['front porch of a white suburban craftsman home', 'navy front door, potted boxwoods, clean lawn', 'one set of house keys in the left hand'], lighting: ['late-afternoon sun from frame left, warm', 'white siding bounce, ratio 1:2', 'warm 4600 K'], framing: 'three_quarter', aperture: 'f/2.8', negatives: ['for sale sign with text, sold sign, realtor logo'] },
  'law-office': { outfit: { ...NAVY_BLAZER, top: 'dark navy three-button suit jacket #1C2233 over a white collared shirt #F5F5F2' }, pose: 'standing in front of dark wood bookshelves, one hand resting on the back of a leather chair', expression: 'serious trustworthy closed-mouth smile', scene: ['traditional law office', 'floor-to-ceiling dark wood shelves of leather-bound books, green banker lamp', 'none'], lighting: ['window light from frame left', 'warm desk lamp practical at frame right, ratio 1:3', 'mixed 4800 K'], framing: 'half', aperture: 'f/2.8', negatives: ['readable book spines, courtroom, gavel'] },
  'holiday-season': { outfit: { top: 'chunky cable-knit sweater in deep red #7A1E24', bottom: 'dark charcoal trousers #333333', jewelry: 'none', watch: 'none' }, pose: 'seated on the arm of a sofa beside a decorated pine tree, holding a white ceramic mug with both hands', expression: 'cozy genuine smile, eyes slightly crinkled', scene: ['cozy living room', 'decorated pine tree with warm string lights as soft bokeh, knit throw', 'one white ceramic mug'], lighting: ['warm lamp at frame left', 'string-light glow fill, ratio 1:3', 'tungsten 3200 K'], framing: 'half', aperture: 'f/2.0', negatives: ['santa hat, reindeer ears, text, greeting-card lettering'] },
  boardroom: { outfit: NAVY_BLAZER, pose: 'standing at the head of a long oak table, both hands resting lightly on the table edge, leaning forward 10 degrees', expression: 'engaged confident smile', scene: ['modern boardroom', 'long oak table, black mesh chairs, glass wall', 'none'], lighting: ['soft daylight from the glass wall at frame right', 'overhead panel fill, ratio 1:2', 'daylight 5600 K'], framing: 'three_quarter', aperture: 'f/2.8' },
  'conference-stage': { outfit: NAVY_BLAZER, pose: 'standing on stage mid-talk, right hand raised at chest height in an open explaining gesture, head turned 15 degrees to frame left', expression: 'animated speaking expression, mouth slightly open', scene: ['conference stage', 'dark backdrop with soft blue ambient light, blank screen', 'small black headset microphone on the left cheek'], lighting: ['warm front spotlight from above the audience', 'blue ambient backlight, ratio 1:4', 'warm 3800 K on subject'], framing: 'three_quarter', aperture: 'f/2.0', constraints: ['GAZE: looking toward the audience at frame left, not into the lens'], negatives: ['text on screen, slides with words, event logo'] },
  'podcast-studio': { outfit: KNIT, pose: 'seated at a desk, leaning slightly toward a black boom-arm microphone, headphones around the neck', expression: 'mid-laugh, relaxed', scene: ['small podcast studio', 'grey acoustic foam panels, warm lamp', 'black boom-arm microphone, over-ear headphones'], lighting: ['soft key from frame right', 'warm lamp practical behind, ratio 1:3', 'warm 4000 K'], framing: 'half', aperture: 'f/2.0' },
  'coworking-space': { outfit: { ...KNIT, top: 'light denim button-up shirt #8FA7C0, sleeves rolled to the elbow' }, pose: 'standing behind a long shared table, one hand on an open laptop, turned 20 degrees to frame left', expression: 'bright natural smile', scene: ['industrial coworking space', 'exposed brick, long shared tables, hanging plants, people far and blurred', 'one open laptop'], lighting: ['diffused skylight from above', 'brick bounce, ratio 1:2', 'daylight 5600 K'], framing: 'half', aperture: 'f/2.0' },
  'rooftop-terrace': { outfit: { top: 'relaxed cream linen shirt #EEE6D8, top two buttons open', bottom: 'beige chino trousers #C8B89A', jewelry: 'none', watch: 'thin silver watch on the left wrist' }, pose: 'leaning back against a glass railing, elbows resting on it, weight on the left leg', expression: 'relaxed warm smile', scene: ['city rooftop terrace', 'glass railing, teak furniture, soft city skyline at sunset', 'none'], lighting: ['golden-hour sun behind the subject, warm rim light on hair', 'reflector fill from the front, ratio 1:2', 'warm 3800 K'], framing: 'three_quarter', aperture: 'f/2.0' },
  'on-the-road': { outfit: { ...KNIT, outerwear: 'unstructured navy blazer #22304A' }, pose: 'seated in the driver seat of a parked car, turned 40 degrees toward the camera, left hand on the steering wheel', expression: 'friendly candid smile', scene: ['parked modern car interior', 'tan leather seats, tree-lined street blurred through the window', 'none'], lighting: ['soft daylight through the windshield', 'interior bounce, ratio 1:2', 'daylight 5800 K'], framing: 'close', aperture: 'f/2.0', negatives: ['car brand badge, steering wheel logo, driving in motion'] },
  'hotel-lobby': { outfit: NAVY_BLAZER, pose: 'standing beside a velvet sofa in a grand lobby, holding a leather portfolio at the hip with the right hand', expression: 'polished closed-mouth smile', scene: ['luxury hotel lobby', 'cream marble floor, brass details, velvet sofa', 'one dark brown leather portfolio'], lighting: ['warm ambient lobby light from above', 'soft brass reflections, ratio 1:3', 'warm 3600 K'], framing: 'three_quarter', aperture: 'f/2.8' },
  'networking-event': { outfit: { ...NAVY_BLAZER, top: 'black tailored blazer #1A1A1A over a plain black crew-neck top #222222' }, pose: 'standing with a glass of sparkling water at chest height in the right hand, body turned 25 degrees to frame left', expression: 'engaged mid-conversation smile', scene: ['evening networking event in a loft', 'pendant lights as warm bokeh, guests far and blurred', 'one clear glass of sparkling water'], lighting: ['warm pendant light from above left', 'ambient room fill, ratio 1:3', 'warm 3400 K'], framing: 'half', aperture: 'f/2.0', negatives: ['name badge with text, wine bottle labels'] },
};

/** The locked shot for a style, or a neutral studio head shot when the style has none yet. */
export const influencerShotFor = (templateId: string): LockedShot => build(SPECS[templateId] ?? SPECS['studio-backdrop']!);

/** Styles with a locked shot (used by tests). */
export const INFLUENCER_SHOT_IDS: readonly string[] = Object.keys(SPECS);

/**
 * The base face made from a description ("Describe"): a plain, evenly lit head-and-shoulders photo,
 * so it works as the identity reference for every style later.
 */
export const BASE_PORTRAIT_SHOT: LockedShot = build({
  outfit: { top: 'plain heather-grey cotton crew-neck t-shirt #9A9A9C, soft creases at the shoulders', bottom: 'not visible', jewelry: 'none', watch: 'none' },
  pose: 'standing square to the camera, shoulders level and relaxed, head straight with 0 degrees tilt',
  expression: 'neutral friendly face with a slight closed-mouth smile',
  scene: ['plain room', 'matte light grey painted wall #CFCDC9, 1.5 m behind the subject, faint uneven paint texture', 'none'],
  lighting: ['large window at frame left, 30 degrees, soft overcast daylight', 'white wall bounce at frame right, ratio 1:2', 'daylight 5600 K'],
  framing: 'close',
  aperture: 'f/4.0',
  constraints: ['FACE: both eyes, both ears and the full hairline visible; nothing covers the face'],
  negatives: ['sunglasses, hat, hands near the face, heavy makeup, dramatic lighting, blurred face'],
});
