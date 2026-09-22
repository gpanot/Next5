import { NextResponse, type NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { adminRoute } from '../../../../../src/server/admin/route';
import { readForm, normalizeUpload } from '../../../../../src/server/storage/images';
import { putObject, presignObject } from '../../../../../src/server/storage/objectStore';
import { generateGeminiImage } from '../../../../../src/lib/reapiImage';

export const maxDuration = 120;

/**
 * Portrait-clone instruction prompt sent alongside the reference image to Gemini 3 Pro Image.
 *
 * Gemini is natively multimodal: it sees the reference photo directly, so there is no need
 * for a GPT-4o pre-analysis step. The prompt locks every variable the skill defines so the
 * model has zero freedom to randomise traits.
 *
 * Aligned with the portrait-clone skill non-negotiables:
 *  - Lock everything, lock absence, no quality boosters, imperfections present,
 *    capture pipeline stated, guidance toward ordinary real person.
 */
const PORTRAIT_CLONE_PROMPT = `Generate a new portrait of a different person who shares the same overall look as the person in the reference image.

IDENTITY TRANSFER RULES — follow exactly:
- Replicate: face shape, eye shape/color/tilt/lid coverage, brow arch and color, nose bridge and tip shape, lip proportions and color, skin tone, freckle and mole pattern and count, hair cut/length/color/texture, beard style and density (or clean-shaven if absent), outfit type/color/fabric, expression, head tilt, background color and texture, lighting direction and quality.
- Do NOT copy the exact identity — produce a new distinct person with those traits.
- Lock absence: if no glasses, earrings, hat, tattoos, necklace, or props are visible in the reference, produce none.

IMPERFECTIONS — mandatory, located:
- Visible skin pores on nose and cheeks, mild redness on cheeks if present in reference.
- Slight facial asymmetry (one eye marginally higher, one brow slightly thicker).
- Hair flyaways at crown, clumping at ends, no strand-by-strand definition.
- Fabric creases at shoulder seam and collar.
- Background: slightly uneven texture, minor compression artefacts.

CAMERA & MEDIUM:
- Phone camera selfie, slight barrel distortion at frame edges.
- Mild sensor noise in shadows, no sharpening, low micro-contrast.
- Flat natural color grading, muted saturation, no HDR, no bloom.
- JPEG compression artefacts at quality ~85.
- Frame: face fills top 70%, shoulders visible at bottom 30%, 9:16 vertical.
- No watermark, no text, no second person, no logo.

DO NOT USE: 4K, ultra-detailed, hyper-detailed, masterpiece, best quality, photorealistic render, sharp focus, crisp, flawless skin, poreless, airbrushed, perfect symmetry, glowing skin, shiny hair, every hair strand defined, studio lighting, beauty retouch, stock photo, magazine cover.`;

/** Anti-slop negatives always sent alongside the prompt. */
const NEGATIVE_PROMPT = [
  'ultra-detailed, hyper-detailed, 8K, 4K, masterpiece, best quality, ultra-realistic, photorealistic render, sharp focus, crisp, intricate details',
  'oversharpened, high clarity, HDR, high micro-contrast, glowing skin, luminous, radiant, dreamy glow, bloom',
  'flawless skin, poreless, smooth skin, perfect skin, porcelain, waxy, glossy skin highlights, airbrushed, retouched, plastic skin',
  'perfect symmetry, perfect teeth, every hair strand defined, shiny hair highlights, voluminous glossy waves',
  'pristine clothing, wrinkle-free fabric, perfectly even background, studio perfection',
  'stock photo, advertising photo, magazine cover, professional retouching, beauty campaign',
  'big round double-eyelid eyes, V-line jaw, aegyo sal, idol face',
  'glasses, earrings, hat, necklace, bag, props, second person, text, watermark, logo, tattoos',
  'illustration, 3D render, CGI, painting, cartoon',
].join(', ');

/**
 * POST /api/admin/gallery-faces/generate
 * Multipart body: file (reference photo)
 *
 * 1. Normalises + stores the reference photo in R2 (gallery-drafts/refs/)
 * 2. Gets a presigned URL so Gemini can see it
 * 3. Calls Gemini 3 Pro Image (reapi) with the portrait-clone prompt + reference image (9:16, 1K)
 *    — no GPT-4o step: Gemini is natively multimodal and reads the photo directly
 * 4. Downloads & stores the generated image in R2 (gallery-drafts/gen/)
 *
 * Returns: { draftId, generatedKey, generatedUrl, referenceKey, referenceUrl, prompt, negativePrompt, createdAt }
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const form = await readForm(req);
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file_required' }, { status: 400 });
  }

  const draftId = randomUUID().replace(/-/g, '').slice(0, 25);

  // 1. Normalise + store the reference photo in R2
  const refBuffer = await normalizeUpload(file, 'gallery draft reference');
  const referenceKey = `gallery-drafts/refs/${draftId}.jpg`;
  await putObject(referenceKey, refBuffer, 'image/jpeg');
  const referenceUrl = await presignObject(referenceKey);
  if (!referenceUrl) {
    return NextResponse.json({ error: 'Failed to presign reference image' }, { status: 500 });
  }

  // 2. Generate portrait with Gemini 3 Pro Image (reapi) — no intermediate GPT-4o call.
  //    Gemini receives both the locked text prompt and the reference image URL directly.
  const generatedCdnUrl = await generateGeminiImage(
    {
      prompt: PORTRAIT_CLONE_PROMPT,
      imageUrls: [referenceUrl],
      ratio: '9:16',
      resolution: '1K',
    },
    { timeoutMs: 110_000 },
  );

  // 3. Download result from reapi CDN and store permanently in R2
  const genRes = await fetch(generatedCdnUrl);
  if (!genRes.ok) {
    return NextResponse.json({ error: `Could not download generated image (HTTP ${genRes.status})` }, { status: 502 });
  }
  const genBuffer = Buffer.from(await genRes.arrayBuffer());
  const generatedKey = `gallery-drafts/gen/${draftId}.jpg`;
  await putObject(generatedKey, genBuffer, 'image/jpeg');

  const [generatedUrl, freshReferenceUrl] = await Promise.all([
    presignObject(generatedKey),
    presignObject(referenceKey),
  ]);

  return NextResponse.json({
    draftId,
    generatedKey,
    generatedUrl,
    referenceKey,
    referenceUrl: freshReferenceUrl,
    prompt: PORTRAIT_CLONE_PROMPT,
    negativePrompt: NEGATIVE_PROMPT,
    portraitJson: {},        // no GPT-4o analysis — Gemini reads the image natively
    createdAt: new Date().toISOString(),
  }, { status: 201 });
});
