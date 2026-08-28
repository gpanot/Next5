/**
 * Studio prompts for WaveSpeed Nano Banana 2 Edit.
 *
 * Each studio has 5 prompts (index 0 = preview / shot 1, indices 1–4 = shots 2–5).
 * The model receives the customer's uploaded photo as the reference image and these
 * prompts as the creative direction. Keep the base instruction first in every prompt
 * so the model always anchors on preserving the person's identity.
 */

const ANCHOR =
  "Keep this exact person's face, skin tone, hair, and likeness unchanged. Do not alter their features. ";

const QUALITY = ' Ultra-photorealistic, professional photography, high detail, sharp focus.';

// ── Per-studio scene prompts ───────────────────────────────────────────────────

const STUDIO_PROMPTS: Record<string, readonly string[]> = {
  'golden-saigon': [
    // Shot 1 — preview
    ANCHOR +
      'Transform into an editorial fashion portrait on a golden-hour rooftop in Ho Chi Minh City, Vietnam. Warm amber and gold light, Saigon skyline glowing in the background. Elegant feminine styling, flowing dress. Shallow depth of field, 85mm portrait lens.' +
      QUALITY,
    // Shot 2
    ANCHOR +
      'Place in front of ornate French colonial architecture in Saigon, golden afternoon light creating long warm shadows. Confident, relaxed posture against the grand facade. Editorial fashion photography.' +
      QUALITY,
    // Shot 3
    ANCHOR +
      'Inside a beautiful boutique café in Saigon with warm wooden interiors, hanging plants and golden light through tall windows. Sitting naturally, looking stylish and at ease. Lifestyle fashion portrait.' +
      QUALITY,
    // Shot 4
    ANCHOR +
      'Walking along a gorgeous Saigon street at golden hour, motion blur on passing scooters in background. Natural movement, effortless style. Authentic Saigon street fashion photography.' +
      QUALITY,
    // Shot 5
    ANCHOR +
      'Standing at a high viewpoint overlooking the Saigon skyline at sunset, city bathed in warm orange and pink light. Wide cinematic framing, fashion editorial feel.' +
      QUALITY,
  ],

  'soft-girl-saigon': [
    ANCHOR +
      'Soft romantic portrait in a dreamy pastel café in Saigon. Cream and blush pink tones, gentle morning light through sheer curtains, fresh flowers nearby. Feminine, delicate, and effortlessly beautiful. Lifestyle portrait photography.' +
      QUALITY,
    ANCHOR +
      'Sitting at a beautiful café table surrounded by fresh flowers — peonies and baby\'s breath — soft diffused light. Romantic and feminine styling. Pastel color palette, gentle bokeh background.' +
      QUALITY,
    ANCHOR +
      'Walking through a flower market in Saigon, surrounded by vivid blooms. Soft natural morning light. Dreamy romantic lifestyle photography with gentle lens flare.' +
      QUALITY,
    ANCHOR +
      'Reading a book in a quiet sunlit corner of a cozy café. Warm gentle light, latte on the table, greenery framing the shot. Cozy feminine lifestyle portrait.' +
      QUALITY,
    ANCHOR +
      'Strolling along a tree-lined Saigon street, dappled sunlight filtering through leaves creating beautiful bokeh. Soft romantic outdoor lifestyle photography.' +
      QUALITY,
  ],

  'luxury-saigon': [
    ANCHOR +
      'Luxury hotel lobby portrait in Saigon, grand marble interior with gold accents and dramatic lighting. Sophisticated, powerful, and elegant styling. High-fashion editorial photography.' +
      QUALITY,
    ANCHOR +
      'Rooftop infinity pool of a five-star Saigon hotel, glittering city skyline behind. Sophisticated and elegant. Fashion editorial photography, cool blue and gold tones.' +
      QUALITY,
    ANCHOR +
      'Inside a high-end restaurant in Saigon with crystal chandeliers and white tablecloths. Poised and elegant posture. Fine dining ambiance, luxury fashion photography.' +
      QUALITY,
    ANCHOR +
      'Standing outside a luxury boutique in Saigon, sleek modern facade, designer shopping bags. Sophisticated, expensive aesthetic. High-fashion street photography.' +
      QUALITY,
    ANCHOR +
      'Penthouse terrace overlooking the Saigon skyline at dusk, city lights beginning to glow. Powerful editorial stance. Luxury fashion photography with dramatic sky.' +
      QUALITY,
  ],

  'night-out': [
    ANCHOR +
      'Cinematic night portrait in Ho Chi Minh City, surrounded by vibrant neon lights and bokeh. Bold, dramatic, irresistible. Night fashion photography, strong contrast lighting.' +
      QUALITY,
    ANCHOR +
      'Standing outside an upscale Saigon bar or club at night, glowing sign above, city energy in the background. Bold styling, confident pose. Cinematic night fashion photography.' +
      QUALITY,
    ANCHOR +
      'Walking through District 1 Saigon at night, illuminated streets, colorful lights reflecting on wet pavement. Bold and confident. Urban night fashion photography.' +
      QUALITY,
    ANCHOR +
      'Rooftop bar at night in Saigon, city lights spreading to the horizon below, cocktail in hand. Glamorous and cinematic. Night fashion editorial.' +
      QUALITY,
    ANCHOR +
      'Night market in Saigon, colorful lanterns and food stalls glowing, vibrant atmosphere. Bold fashion statement, strong presence. Night street fashion photography.' +
      QUALITY,
  ],

  'outfit-shoot': [
    ANCHOR +
      'Full-body fashion outfit photograph on a clean stylish Saigon street, neutral building background. Complete outfit clearly visible from head to toe. Fashion lookbook style photography.' +
      QUALITY,
    ANCHOR +
      'Outfit detail shot in a bright modern Saigon café, showing fabric texture, accessories, and styling details. Lifestyle fashion photography, warm natural light.' +
      QUALITY,
    ANCHOR +
      'Full-body outfit shot on a beautiful Saigon rooftop, wide angle showing complete look with city in background. Fashion editorial photography.' +
      QUALITY,
    ANCHOR +
      'Walking through a stylish shopping district in Saigon showing outfit in motion, confident stride. Clean street fashion photography.' +
      QUALITY,
    ANCHOR +
      'Standing against a minimal architectural background in Saigon — clean wall, geometric shapes. Full-body outfit portrait, editorial minimalist fashion photography.' +
      QUALITY,
  ],
};

// ── Feeling modifiers ─────────────────────────────────────────────────────────

const FEELING_MODIFIERS: Record<string, string> = {
  'beautiful-confident': ', radiant glowing expression, confident empowered posture',
  'soft-feminine': ', gentle soft expression, delicate feminine energy, natural beauty',
  'elegant-expensive': ', sophisticated refined pose, luxury aesthetic, poised and regal',
  'bold-irresistible': ', bold intense captivating gaze, magnetic powerful presence',
  'fashion-girl': ', fashion-forward editorial model pose, style-conscious, trendy',
  'everyone-noticed': ', striking unforgettable presence, commanding attention, luminous',
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the fully assembled prompt for a given studio, scene, and feeling choices.
 *
 * @param studioId  - route id (e.g. 'golden-saigon')
 * @param sceneIndex - 0 = preview/shot 1, 1–4 = shots 2–5
 * @param feelings  - array of FeelingChoice ids the customer selected (max 2)
 */
export function getPrompt(
  studioId: string,
  sceneIndex: number,
  feelings: readonly string[],
): string {
  const prompts = STUDIO_PROMPTS[studioId] ?? STUDIO_PROMPTS['golden-saigon'];
  const base = prompts[Math.min(sceneIndex, prompts.length - 1)];
  const modifiers = feelings.map((f) => FEELING_MODIFIERS[f] ?? '').join('');
  return base + modifiers;
}

export { STUDIO_PROMPTS, FEELING_MODIFIERS };
