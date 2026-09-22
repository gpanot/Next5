// server-only — shared prompt-brief builder used by both:
//   - POST /api/admin/ugc-lab/scripts        (initial generation)
//   - POST /api/admin/ugc-lab/suggest-prompt  (user-triggered refresh)

import type { UgcScene, UgcShot } from '../../config/ugcLab';

const CAMERA_MOVE: Record<UgcShot, string> = {
  close: 'Camera stays steady and very close on the face.',
  medium: 'Camera holds medium framing with a slow, subtle push-in.',
  wide: 'Camera starts wide and glides closer to a medium waist-up frame.',
};

// ── Niche → visual context hints ─────────────────────────────────────────────
// These examples seed the model so it picks the right env/outfit without hallucinating
// brands or exact details.  Keep them generic and additive — the model fills the rest.

const NICHE_HINTS: [RegExp, string][] = [
  [/fitness|gym|workout|sport|training|health/i,
   'gym or outdoor fitness setting, athletic wear (leggings/shorts + sports top or hoodie), natural energetic lighting'],
  [/real.?estate|realtor|property|house|home/i,
   'in front of a house exterior or inside a staged living room, smart-casual attire (blazer or neat top), natural daylight'],
  [/saas|software|tech|startup|coding|developer/i,
   'modern home office or co-working space, casual-professional outfit (clean shirt / blazer), bright ambient light'],
  [/finance|money|invest|crypto|trading|wealth/i,
   'sleek office or neutral minimal background, business-casual attire, sharp professional lighting'],
  [/beauty|makeup|skincare|cosmetic/i,
   'bright makeup studio or vanity setup, stylish casual outfit, ring-light warm glow'],
  [/food|recipe|cook|nutrition|diet/i,
   'clean kitchen counter or restaurant setting, casual apron-optional outfit, warm natural lighting'],
  [/travel|vacation|lifestyle/i,
   'scenic outdoor location or hotel balcony, casual stylish outfit, golden-hour or bright daylight'],
  [/education|teacher|coach|course|learn/i,
   'clean home-office or whiteboard background, smart-casual outfit, bright even lighting'],
  [/fashion|style|outfit/i,
   'lifestyle setting (boutique / urban street / bright studio), trendy outfit matching the niche aesthetic'],
  [/parenting|mom|dad|family|kids/i,
   'warm home living room or backyard, casual comfortable clothing, soft natural light'],
  [/business|entrepreneur|marketing|sales/i,
   'modern office or clean neutral background, professional-smart attire, sharp confident lighting'],
];

function nicheVisualHint(niche: string): string {
  for (const [pattern, hint] of NICHE_HINTS) {
    if (pattern.test(niche)) return hint;
  }
  // Generic fallback: clean, modern, niche-branded aesthetic
  return `clean modern setting appropriate for a ${niche} creator, polished casual outfit, bright even lighting`;
}

// ── Input type ────────────────────────────────────────────────────────────────

export type ContextBriefInput = {
  hook: string;
  industry?: string;
  scene?: UgcScene | null;
  /** Avatar-kind portrait JSON (visual attribute map). */
  portraitJson?: Record<string, unknown> | null;
};

// ── Public builder ────────────────────────────────────────────────────────────

/**
 * Returns a GPT brief that instructs the model to generate a 3-sentence scene description
 * for a Seedance / Wan 3.0 video prompt.
 *
 * New philosophy (replaces the old "continue the first frame exactly" approach):
 *   • SCENE  → adapt to the niche (location, outfit, lighting)
 *   • FACE   → must match the reference photo exactly
 *   • ENERGY → niche-appropriate confidence and delivery style
 */
export function buildContextBrief({ hook, industry, scene, portraitJson }: ContextBriefInput): string {
  const niche = industry?.trim() || 'content creator';
  const hint = nicheVisualHint(niche);

  // Describe the character from available data
  let personDesc: string;
  if (scene) {
    personDesc = `${scene.person} (photo context: ${scene.setting}, ${scene.action})`;
  } else if (portraitJson && typeof portraitJson === 'object') {
    const p = portraitJson as Record<string, string | undefined>;
    const parts = [
      p.gender ?? null,
      p.age ? `~${p.age} years old` : null,
      p.hair ? `${p.hair} hair` : null,
      p.skin_tone ? `${p.skin_tone} skin` : null,
      p.expression ? `${p.expression} expression` : null,
    ].filter(Boolean);
    personDesc = parts.length ? parts.join(', ') : 'person in the reference photo';
  } else {
    personDesc = 'person in the reference photo';
  }

  const shotNote = scene ? `Preferred shot: ${scene.shot}. ${CAMERA_MOVE[scene.shot]}` : '';

  return (
    `Write a 3-sentence scene description for a Seedance / Wan 3.0 first-frame video prompt.\n\n` +
    `Niche: ${niche}\n` +
    `Hook (what they say on camera): "${hook}"\n` +
    `Character: ${personDesc}\n` +
    `Niche visual context: ${hint}\n` +
    (shotNote ? `${shotNote}\n` : '') +
    `\nRules:\n` +
    `• SCENE — Use the "Niche visual context" above as inspiration: set the location, outfit, and lighting to match the ${niche} world. Be specific and cinematic.\n` +
    `• FACE — The character's face, hair color, and skin tone must be identical to the reference photo. Do NOT change these.\n` +
    `• OUTFIT & SETTING — Adapt freely to fit the niche (e.g. for fitness: gym clothes + gym backdrop).\n` +
    `• ENERGY — The character should radiate the credibility and confidence of a top ${niche} TikTok creator.\n` +
    `\nWrite exactly 3 sentences:\n` +
    `1. Describe the character in their niche environment: location, outfit, and lighting — vivid, specific, and immersive.\n` +
    `2. Open with "Keep the exact face, hair color, and skin tone from the reference photo." then add 1–2 niche-specific outfit or prop details.\n` +
    `3. Camera framing and delivery energy — concise (one sentence).\n\n` +
    `Do NOT include spoken dialogue, subtitles, script lines, "they say", or any post-production rules.\n` +
    `Return JSON only: { "context": "..." }`
  );
}
