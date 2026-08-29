import { NextRequest, NextResponse } from 'next/server';
import { uploadPhotoToWaveSpeed, submitEdit, waitForTask } from '../../../../src/lib/wavespeed';
import { mirrorToR2, uploadToR2, getPresignedUrl, r2IsConfigured } from '../../../../src/lib/r2';
import { getPrompt } from '../../../../src/data/prompts';
import { isMockGeneration } from '../../../../src/lib/mock';
import { photoRoutes } from '../../../../src/data/routes';

export type SceneRequestBody = {
  /** base64 data URL of the customer's uploaded photo */
  photoDataUrl: string;
  studioId: string;
  feelings: string[];
  bookingId: string;
  /** 1–4 (scenes after the preview shot 0) */
  sceneIndex: number;
};

export type SceneResponseBody = {
  ok: true;
  scene: number;
  url: string;
};

// Allow up to 120s for a single scene — well within Vercel's Pro 300s limit
export const maxDuration = 120;

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME ?? 'Orders';

async function updateAirtable(bookingId: string, updates: Record<string, unknown>) {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) return;

  const tableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;
  const headers = {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const searchRes = await fetch(
    `${tableUrl}?filterByFormula=${encodeURIComponent(`{Order ID}="${bookingId}"`)}`,
    { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } },
  );
  const searchData = await searchRes.json();
  const record = searchData.records?.[0];

  if (record) {
    await fetch(`${tableUrl}/${record.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields: updates }),
    });
  } else {
    // Record doesn't exist yet — create it so the update isn't lost
    console.warn('[scene] Airtable record not found for booking, creating:', bookingId);
    await fetch(tableUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fields: {
          'Order ID': bookingId,
          'Shoot Status': 'Creating',
          'Booking Date': new Date().toISOString().slice(0, 10),
          ...updates,
        },
      }),
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SceneRequestBody;
    const { photoDataUrl, studioId, feelings, bookingId, sceneIndex } = body;

    if (!photoDataUrl || !studioId || !bookingId || sceneIndex == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (sceneIndex < 1 || sceneIndex > 4) {
      return NextResponse.json({ error: 'sceneIndex must be 1–4' }, { status: 400 });
    }

    if (isMockGeneration()) {
      // Simulate real generation time so the "Creating…" reveal reads the
      // same as production, without touching WaveSpeed, R2, or Airtable.
      await new Promise((resolve) => setTimeout(resolve, 1200 + Math.random() * 1000));

      const route = photoRoutes.find((r) => r.id === studioId) ?? photoRoutes[0];
      const shotNumber = sceneIndex + 1;
      const url = route.shots[shotNumber - 1]?.src ?? route.shots[0].src;

      return NextResponse.json({ ok: true, scene: shotNumber, url } satisfies SceneResponseBody);
    }

    // 1. Upload reference photo to WaveSpeed (each call is independent)
    const base64 = photoDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    // On the first scene, also save the customer's original upload to R2
    if (sceneIndex === 1 && r2IsConfigured()) {
      try {
        const customerKey = `${bookingId}/customer-upload.jpg`;
        await uploadToR2(customerKey, buffer, 'image/jpeg');
        const presigned = await getPresignedUrl(customerKey, 60 * 60 * 24 * 30); // 30-day
        if (presigned) {
          // Fire-and-forget Airtable update for customer photo
          updateAirtable(bookingId, { 'Customer Photo': presigned }).catch(() => {});
        }
      } catch (err) {
        console.warn('[scene] Failed to save customer photo to R2:', err);
      }
    }

    const imageUrl = await uploadPhotoToWaveSpeed(buffer);

    // 2. Build prompt for this scene
    const prompt = await getPrompt(studioId, sceneIndex, feelings);

    // 3. Submit to WaveSpeed
    const taskId = await submitEdit({
      imageUrl,
      prompt,
      aspectRatio: '3:4',
      resolution: '1k',
    });

    // 4. Wait for this single scene (up to 110s)
    const waveSpeedUrl = await waitForTask(taskId, { timeoutMs: 110_000 });

    // 5. Mirror to R2
    const shotNumber = sceneIndex + 1; // scene 1 → shot 2, scene 4 → shot 5
    const r2Key = `${bookingId}/shot-${String(shotNumber).padStart(2, '0')}.jpg`;
    const finalUrl = await mirrorToR2(waveSpeedUrl, r2Key);

    let serveUrl = waveSpeedUrl;
    if (r2IsConfigured() && finalUrl !== waveSpeedUrl) {
      const presigned = await getPresignedUrl(r2Key, 60 * 60 * 24 * 7);
      if (presigned) serveUrl = presigned;
    }

    // 6. Update Airtable with this individual photo link
    const photoColumn = `Photo ${shotNumber}`;
    const airtableFields: Record<string, unknown> = { [photoColumn]: serveUrl };

    // On the last scene, also mark as Delivered
    if (sceneIndex === 4) {
      airtableFields['Shoot Status'] = 'Delivered';
    } else if (sceneIndex === 1) {
      airtableFields['Shoot Status'] = 'Creating';
    }

    await updateAirtable(bookingId, airtableFields);

    return NextResponse.json({
      ok: true,
      scene: shotNumber,
      url: serveUrl,
    } satisfies SceneResponseBody);
  } catch (err) {
    console.error('[scene] POST error:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
