import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../../src/server/admin/route';

export const maxDuration = 30;

const POYO_SUBMIT_URL = 'https://api.poyo.ai/api/generate/submit';

const MOTION_CONTROL_PROMPT = `Transfer the exact performance of the person in the reference video to the character shown in the reference image.

The reference VIDEO is the master for:
- body movement
- hand gestures
- facial expressions
- speaking rhythm
- head movement
- posture
- timing
- camera framing
- camera movement

The reference IMAGE is the master for:
- character identity
- face
- hair
- skin appearance
- clothing appearance

Make the new character look like a real person naturally performing the same scene.

Preserve the original background, camera composition, lighting and overall realism.

Do not reinterpret the performance.
Do not create a new scene.
Do not change the choreography or gestures.
Do not introduce additional people or objects.

The result should look like the same UGC video was filmed by a different character.`;

type SubmitBody = {
  imageVendorUrl?: string;
  videoVendorUrl?: string;
};

type PoyoSubmitResponse = {
  code: number;
  data?: { task_id: string; status: string };
  error?: { message: string; type: string };
};

/**
 * POST { imageVendorUrl, videoVendorUrl }
 * → submits to Poyo kling-3.0-motion-control at 720p
 * → returns { taskId }
 */
export const POST = adminRoute(async (req: NextRequest) => {
  const { imageVendorUrl, videoVendorUrl } = (await req.json()) as SubmitBody;

  if (!imageVendorUrl?.trim()) {
    return NextResponse.json({ error: 'imageVendorUrl is required — upload a character image first' }, { status: 400 });
  }
  if (!videoVendorUrl?.trim()) {
    return NextResponse.json({ error: 'videoVendorUrl is required — upload a reference video first' }, { status: 400 });
  }

  const apiKey = process.env.POYO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'POYO_API_KEY is not configured' }, { status: 503 });
  }

  const poyoRes = await fetch(POYO_SUBMIT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'kling-3.0-motion-control',
      input: {
        prompt: MOTION_CONTROL_PROMPT,
        image_urls: [imageVendorUrl],
        video_urls: [videoVendorUrl],
        resolution: '720p',
        character_orientation: 'video',
      },
    }),
  });

  const poyoData = (await poyoRes.json()) as PoyoSubmitResponse;

  if (!poyoRes.ok || !poyoData.data?.task_id) {
    const msg = poyoData.error?.message ?? `Poyo returned ${poyoRes.status}`;
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({ taskId: poyoData.data.task_id }, { status: 201 });
});
