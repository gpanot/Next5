/**
 * One-off script: creates the "Prompts" table in Airtable (if it doesn't exist)
 * and seeds all 25 route prompts (5 routes × 5 scenes).
 *
 * Run with:  npx tsx scripts/seed-prompts.ts
 *
 * The script reads AIRTABLE_API_KEY and AIRTABLE_BASE_ID from .env.local.
 * On success it prints the new table ID — copy it into .env.local as
 * AIRTABLE_PROMPTS_TABLE_ID.
 */

// Inline env — no dotenv dependency needed
const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!API_KEY || !BASE_ID) {
  console.error('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID in .env.local');
  process.exit(1);
}

// ── Prompts (copied from src/data/prompts.ts) ─────────────────────────────

const ANCHOR =
  "Keep this exact person's face, skin tone, hair, and likeness unchanged. Do not alter their features. ";

const QUALITY = ' Ultra-photorealistic, professional photography, high detail, sharp focus.';

const STUDIO_PROMPTS: Record<string, readonly string[]> = {
  'golden-saigon': [
    ANCHOR +
      'Transform into an editorial fashion portrait on a golden-hour rooftop in Ho Chi Minh City, Vietnam. Warm amber and gold light, Saigon skyline glowing in the background. Elegant feminine styling, flowing dress. Shallow depth of field, 85mm portrait lens.' +
      QUALITY,
    ANCHOR +
      'Place in front of ornate French colonial architecture in Saigon, golden afternoon light creating long warm shadows. Confident, relaxed posture against the grand facade. Editorial fashion photography.' +
      QUALITY,
    ANCHOR +
      'Inside a beautiful boutique café in Saigon with warm wooden interiors, hanging plants and golden light through tall windows. Sitting naturally, looking stylish and at ease. Lifestyle fashion portrait.' +
      QUALITY,
    ANCHOR +
      'Walking along a gorgeous Saigon street at golden hour, motion blur on passing scooters in background. Natural movement, effortless style. Authentic Saigon street fashion photography.' +
      QUALITY,
    ANCHOR +
      'Standing at a high viewpoint overlooking the Saigon skyline at sunset, city bathed in warm orange and pink light. Wide cinematic framing, fashion editorial feel.' +
      QUALITY,
  ],
  'soft-girl-saigon': [
    ANCHOR +
      'Soft romantic portrait in a dreamy pastel café in Saigon. Cream and blush pink tones, gentle morning light through sheer curtains, fresh flowers nearby. Feminine, delicate, and effortlessly beautiful. Lifestyle portrait photography.' +
      QUALITY,
    ANCHOR +
      "Sitting at a beautiful café table surrounded by fresh flowers — peonies and baby's breath — soft diffused light. Romantic and feminine styling. Pastel color palette, gentle bokeh background." +
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

const ROUTE_LABELS: Record<string, string> = {
  'golden-saigon': 'Golden Saigon',
  'soft-girl-saigon': 'Soft Girl Saigon',
  'luxury-saigon': 'Luxury Saigon',
  'night-out': 'Night Out',
  'outfit-shoot': 'Outfit Shoot',
};

const SCENE_LABELS = [
  'Shot 1 – Preview',
  'Shot 2',
  'Shot 3',
  'Shot 4',
  'Shot 5',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function airtableFetch(path: string, options?: RequestInit) {
  const res = await fetch(`https://api.airtable.com/v0${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });
  const json = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`Airtable error ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

// ── Check if Prompts table already exists ─────────────────────────────────────

async function getExistingPromptsTable(): Promise<{ id: string; name: string } | null> {
  const data = await airtableFetch(`/meta/bases/${BASE_ID}/tables`) as {
    tables: Array<{ id: string; name: string }>;
  };
  return data.tables.find((t) => t.name === 'Prompts') ?? null;
}

// ── Create table ──────────────────────────────────────────────────────────────

async function createPromptsTable(): Promise<string> {
  console.log('Creating Prompts table…');
  const data = await airtableFetch(`/meta/bases/${BASE_ID}/tables`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Prompts',
      description: 'AI generation prompts for each route × scene combination. Edit the Prompt field to change what WaveSpeed generates.',
      fields: [
        { name: 'Name',        type: 'singleLineText' },
        { name: 'Route ID',    type: 'singleLineText' },
        { name: 'Route Label', type: 'singleLineText' },
        { name: 'Scene',       type: 'number', options: { precision: 0 } },
        { name: 'Scene Label', type: 'singleLineText' },
        { name: 'Prompt',      type: 'multilineText' },
        { name: 'Notes',       type: 'multilineText' },
      ],
    }),
  }) as { id: string };
  console.log(`  ✓ Table created: ${data.id}`);
  return data.id;
}

// ── Seed records ──────────────────────────────────────────────────────────────

async function seedRecords(tableId: string) {
  const records: Array<{ fields: Record<string, unknown> }> = [];

  for (const [routeId, prompts] of Object.entries(STUDIO_PROMPTS)) {
    prompts.forEach((prompt, sceneIndex) => {
      records.push({
        fields: {
          'Name':        `${ROUTE_LABELS[routeId]} · ${SCENE_LABELS[sceneIndex]}`,
          'Route ID':    routeId,
          'Route Label': ROUTE_LABELS[routeId],
          'Scene':       sceneIndex,
          'Scene Label': SCENE_LABELS[sceneIndex],
          'Prompt':      prompt,
          'Notes':       sceneIndex === 0
            ? 'Preview shot — shown to customer BEFORE payment.'
            : 'Delivered shot — generated AFTER payment.',
        },
      });
    });
  }

  // Airtable supports max 10 records per batch create call
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10);
    await airtableFetch(`/${BASE_ID}/${encodeURIComponent(tableId)}`, {
      method: 'POST',
      body: JSON.stringify({ records: batch }),
    });
    console.log(`  ✓ Seeded records ${i + 1}–${Math.min(i + 10, records.length)} / ${records.length}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nSeeding prompts into base ${BASE_ID}…\n`);

  let tableId: string;

  const existing = await getExistingPromptsTable();
  if (existing) {
    console.log(`Prompts table already exists (${existing.id}). Skipping creation.`);
    tableId = existing.id;
  } else {
    tableId = await createPromptsTable();
  }

  await seedRecords(tableId);

  console.log(`\n✅ Done! Add this to .env.local (and Vercel/Railway):\n`);
  console.log(`AIRTABLE_PROMPTS_TABLE_ID=${tableId}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
