import { NextRequest, NextResponse } from 'next/server';
import { uploadPhotoToWaveSpeed, submitEdit, waitForTask } from '../../../src/lib/wavespeed';
import { mirrorToR2, getPresignedUrl, r2IsConfigured } from '../../../src/lib/r2';
import { getPrompt } from '../../../src/data/prompts';

export type GenerateRequestBody = {
  /** base64 data URL of the customer's uploaded photo */
  photoDataUrl: string;
  studioId: string;
  studioTitle: string;
  feelings: string[];
  bookingId: string;
};

type GenerateResult = {
  scene: number;
  url: string;
  stored: boolean;
};

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME ?? 'Orders';

async function updateAirtable(bookingId: string, updates: Record<string, unknown>) {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) return;

  // Find the record by Order ID
  const searchUrl =
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}` +
    `?filterByFormula=${encodeURIComponent(`{Order ID}="${bookingId}"`)}`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
  });
  const searchData = await searchRes.json();
  const record = searchData.records?.[0];
  if (!record) {
    console.warn('[generate] Airtable record not found for booking:', bookingId);
    return;
  }

  await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}/${record.id}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: updates }),
    },
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequestBody;
    const { photoDataUrl, studioId, feelings, bookingId } = body;

    // 1. Upload reference photo to WaveSpeed once (reuse for all 4 scenes)
    const base64 = photoDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    const imageUrl = await uploadPhotoToWaveSpeed(buffer);

    // 2. Update Airtable: generating started
    await updateAirtable(bookingId, { 'Shoot Status': 'Creating' });

    // 3. Generate scenes 1–4 (scene 0 was the preview, shown before payment)
    const results: GenerateResult[] = [];

    for (let sceneIndex = 1; sceneIndex <= 4; sceneIndex++) {
      const prompt = await getPrompt(studioId, sceneIndex, feelings);

      // Submit task
      const taskId = await submitEdit({
        imageUrl,
        prompt,
        aspectRatio: '3:4',
        resolution: '1k',
      });

      // Wait for completion (up to 90s per scene)
      const waveSpeedUrl = await waitForTask(taskId, { timeoutMs: 90_000 });

      // Mirror to R2 for permanent storage (falls back to WaveSpeed CDN if R2 not configured)
      const r2Key = `${bookingId}/shot-${String(sceneIndex + 1).padStart(2, '0')}.jpg`;
      const finalUrl = await mirrorToR2(waveSpeedUrl, r2Key);

      // If stored in R2, get a presigned URL for the Airtable record
      let serveUrl = waveSpeedUrl;
      if (r2IsConfigured() && finalUrl !== waveSpeedUrl) {
        const presigned = await getPresignedUrl(r2Key, 60 * 60 * 24 * 7); // 7-day URL
        if (presigned) serveUrl = presigned;
      }

      results.push({ scene: sceneIndex + 1, url: serveUrl, stored: finalUrl !== waveSpeedUrl });
    }

    // 4. Update Airtable: delivered, add photo link (comma-separated URLs)
    const photoLinks = results.map((r) => r.url).join('\n');
    await updateAirtable(bookingId, {
      'Shoot Status': 'Delivered',
      'Photo Link': results[0].url, // Primary link (shot 2, first post-purchase)
      'Notes': `All 5 shots generated.\n\nShot URLs:\n${photoLinks}`,
    });

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error('[generate] POST error:', err);

    // Partial failure: still update Airtable so we know something went wrong
    try {
      const body = (await req.json().catch(() => ({}))) as Partial<GenerateRequestBody>;
      if (body.bookingId) {
        await updateAirtable(body.bookingId, {
          'Shoot Status': 'Scheduled',
          'Notes': `Generation error: ${err instanceof Error ? err.message : 'unknown'}`,
        });
      }
    } catch {
      // best-effort
    }

    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
