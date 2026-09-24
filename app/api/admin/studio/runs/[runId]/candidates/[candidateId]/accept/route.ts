/**
 * POST /api/admin/studio/runs/[runId]/candidates/[candidateId]/accept
 *
 * Marks the candidate as accepted, then via waitUntil:
 *   1. Generates per-slide background images via reAPI (Nano Banana 2 Lite)
 *   2. Uploads each image to R2 as a BlitzAsset
 *   3. Creates a BlitzProject with renderStatus=PENDING so the blitz-worker picks it up
 *   4. Writes blitzProjectId back to the StudioCandidate
 *
 * Returns immediately with { ok: true } — the render is queued asynchronously.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { adminRoute, json } from '../../../../../../../../../src/server/admin/route';
import { prisma } from '../../../../../../../../../src/lib/db';
import { blitzKeys } from '../../../../../../../../../src/server/admin/blitzStore';
import { uploadToR2 } from '../../../../../../../../../src/lib/r2';

export const maxDuration = 120;

type Ctx = { params: Promise<{ runId: string; candidateId: string }> };

// ─── reAPI image generation ───────────────────────────────────────────────────

const REAPI_BASE = 'https://reapi.ai/api/v1';

async function pollReapiTask(taskId: string, apiKey: string): Promise<string | null> {
  const maxMs = 4 * 60_000;
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, 5_000));
    const res = await fetch(`${REAPI_BASE}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const json = (await res.json()) as { status: string; output?: { image_urls?: string[] } };
    if (json.status === 'completed') return json.output?.image_urls?.[0] ?? null;
    if (json.status === 'failed') return null;
  }
  return null;
}

/** Generate one 9:16 image via reAPI and upload to R2. Returns R2 key or null on failure. */
async function generateAndUploadBackground(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const submitRes = await fetch(`${REAPI_BASE}/images/generations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'nano-banana-2-lite', prompt, aspect_ratio: '9:16' }),
    });
    if (!submitRes.ok) return null;

    const submission = (await submitRes.json()) as { id?: string; task_id?: string };
    const taskId = submission.id ?? submission.task_id;
    if (!taskId) return null;

    const imageUrl = await pollReapiTask(taskId, apiKey);
    if (!imageUrl) return null;

    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) return null;
    const buffer = Buffer.from(await imageRes.arrayBuffer());

    const contentType = imageRes.headers.get('content-type') ?? 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';

    const r2Key = blitzKeys.upload('BACKGROUND', ext);
    await uploadToR2(r2Key, buffer, contentType);

    // Register as BlitzAsset so it appears in the library
    await prisma.blitzAsset.create({
      data: {
        type: 'BACKGROUND',
        r2Key,
        name: `Studio: ${prompt.slice(0, 80)} [AI]`,
      },
    });

    return r2Key;
  } catch {
    return null;
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const POST = adminRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { runId, candidateId } = await ctx.params;

  const candidate = await prisma.studioCandidate.findUnique({ where: { id: candidateId } });
  if (!candidate || candidate.runId !== runId) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  if (candidate.status === 'accepted') {
    return json({ ok: true, alreadyAccepted: true });
  }

  // Mark accepted immediately
  await prisma.studioCandidate.update({
    where: { id: candidateId },
    data: { status: 'accepted' },
  });

  waitUntil(
    (async () => {
      const apiKey = process.env.REAPI_API_KEY;

      const payload = candidate.payload as {
        slides: Array<{ text: string; bgPrompt: string }>;
        durationSeconds: number;
        perSlideSeconds: number;
      };

      // ── Generate per-slide background images ──────────────────────────────
      const slidesWithKeys: Array<{ text: string; backgroundKey?: string }> = [];

      if (apiKey) {
        for (const slide of payload.slides) {
          const r2Key = await generateAndUploadBackground(slide.bgPrompt, apiKey);
          slidesWithKeys.push({ text: slide.text, ...(r2Key ? { backgroundKey: r2Key } : {}) });
        }
      } else {
        // No reAPI key — just pass slide text without backgrounds
        for (const slide of payload.slides) {
          slidesWithKeys.push({ text: slide.text });
        }
      }

      // ── Find CAROUSEL BlitzTemplate ───────────────────────────────────────
      const carouselTemplate = await prisma.blitzTemplate.findFirst({
        where: { type: 'CAROUSEL' },
        orderBy: { createdAt: 'asc' },
      });

      if (!carouselTemplate) {
        console.error(`[studio/accept] No CAROUSEL BlitzTemplate found — cannot create BlitzProject for candidate ${candidateId}`);
        return;
      }

      // Need a backgroundKey for the BlitzProject (use first slide's key or a placeholder from template)
      const firstSlideKey = slidesWithKeys[0]?.backgroundKey;
      const defaultAssets = carouselTemplate.defaultAssets as { backgroundKey?: string };
      const backgroundKey = firstSlideKey ?? defaultAssets.backgroundKey ?? '';

      if (!backgroundKey) {
        console.error(`[studio/accept] No backgroundKey available for candidate ${candidateId}`);
        return;
      }

      // ── Create BlitzProject ────────────────────────────────────────────────
      const captionText = payload.slides[0]?.text ?? '';
      const project = await prisma.blitzProject.create({
        data: {
          templateId: carouselTemplate.id,
          currentAssets: {
            backgroundKey,
            slides: slidesWithKeys,
            durationSeconds: payload.durationSeconds,
          },
          captionText,
          renderStatus: 'PENDING',
          mentionBusiness: false,
          overlayZoom: 1.0,
          overlayOffsetX: 0,
          overlayOffsetY: 0,
          isIdentifiablePerson: false,
        },
      });

      // Write blitzProjectId back to candidate
      await prisma.studioCandidate.update({
        where: { id: candidateId },
        data: { blitzProjectId: project.id },
      });

      console.log(`[studio/accept] candidate=${candidateId} blitzProject=${project.id} slides=${slidesWithKeys.length}`);
    })(),
  );

  return json({ ok: true, candidateId });
});
