/**
 * Manual UGC Clone trigger — same call as the UI's "Clone video" button.
 * Uploads 3 files to R2, calls reapi Seedance 2.5 via Treg, polls, downloads output.
 *
 * Usage:
 *   node "clone test/run-clone.mjs"
 */

import { readFile, writeFile } from 'fs/promises';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');

// ── Credentials (from .env.local) ────────────────────────────────────────────

const ACCOUNT_ID  = 'ad4032bd6fb0b9615025f106eb343024';
const ACCESS_KEY  = 'c69d0cbd25da349cfff82fdd39bc515c';
const SECRET_KEY  = '4fa8e1de343b89ad62fa6526e357a5975d639e95902ac29c20211680fa58115e';
const BUCKET      = 'next5-photos';
const TREG_KEY    = 'eyJ1aWQiOjE0MDM5LCJ0diI6MCwiYXVkIjoiaWRlbnRpdHkiLCJvcmciOiJndWlndWkiLCJrZyI6MCwic2NwIjoidGVhbSJ9.GfuGfHmu4c5FeJmkc9FyB1Fy_AiBeEc1mOoAGgU4ESo';
const TREG_BASE   = 'https://api.treg.dev/v1';

// ── Files ────────────────────────────────────────────────────────────────────

const CHARACTER_PATH = path.join(__dirname, 'IMG_20260712_121657.jpg');
const VIDEO_PATH     = path.join(__dirname, 'original trimmed to 5 sec.mp4');
const AUDIO_PATH     = path.join(__dirname, 'audio reference.mp3');
const OUTPUT_PATH    = path.join(__dirname, 'clone-output.mp4');

// ── R2 helpers ────────────────────────────────────────────────────────────────

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
});

async function uploadToR2(key, buffer, contentType) {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType }));
  console.log(`  ✓ uploaded → ${key}`);
}

async function vendorUrl(key) {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 7 * 24 * 3600 },   // 7 days — same as ugcStore.ts
  );
}

// ── Treg helper ───────────────────────────────────────────────────────────────

async function tregCall(endpointId, options = {}) {
  const { method = 'GET', query, body } = options;
  const url = new URL(`${TREG_BASE}/${endpointId}`);
  if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));

  const res = await fetch(url.toString(), {
    method,
    headers: {
      'X-Treg-Token': TREG_KEY,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`treg ${endpointId}: ${text.slice(0, 200)}`); }
  if (!res.ok) throw new Error(`treg ${endpointId}: ${JSON.stringify(json).slice(0, 300)}`);
  return json.data ?? json;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const stamp = `${Date.now()}`;

async function main() {
  console.log('\n=== UGC Clone manual trigger ===\n');

  // 1. Upload files to R2
  console.log('1. Uploading files to R2…');

  const charBuf  = await readFile(CHARACTER_PATH);
  const videoBuf = await readFile(VIDEO_PATH);
  const audioBuf = await readFile(AUDIO_PATH);

  const charKey  = `ugc-lab/clone/characters/${stamp}.jpg`;
  const videoKey = `ugc-lab/clone/videos/${stamp}.mp4`;
  const audioKey = `ugc-lab/clone/voices/${stamp}.mp3`;

  await uploadToR2(charKey,  charBuf,  'image/jpeg');
  await uploadToR2(videoKey, videoBuf, 'video/mp4');
  await uploadToR2(audioKey, audioBuf, 'audio/mpeg');

  // 2. Get vendor URLs (7-day presigned)
  console.log('\n2. Generating vendor URLs…');
  const [imageUrl, videoUrl, audioUrl] = await Promise.all([
    vendorUrl(charKey),
    vendorUrl(videoKey),
    vendorUrl(audioKey),
  ]);
  console.log('  ✓ character:', imageUrl.slice(0, 70) + '…');
  console.log('  ✓ video:    ', videoUrl.slice(0, 70) + '…');
  console.log('  ✓ audio:    ', audioUrl.slice(0, 70) + '…');

  // 3. Build Seedance request body (exact same as submit route)
  const prompt =
    'Replace the face in the scene with the face of the character in @image1. ' +
    'Preserve all movements, expressions, timing, and background exactly. ' +
    'Use the audio as a reference.';

  const seedanceBody = {
    model:          'doubao-seedance-2.5-face',
    content_filter: false,
    prompt,
    duration:       5,        // explicit — dropdown value
    resolution:     '480p',
    generate_audio: true,
    image_urls:     [imageUrl],
    video_urls:     [videoUrl],
    audio_urls:     [audioUrl],
  };

  console.log('\n3. Submitting to reapi Seedance 2.5 via Treg…');
  console.log('   Body:', JSON.stringify({ ...seedanceBody, image_urls: ['…'], video_urls: ['…'], audio_urls: ['…'] }, null, 2));

  const submitResult = await tregCall('reapi.video-gen.seedance-2-5.unrestricted', {
    method: 'POST',
    body:   seedanceBody,
  });

  const taskId = submitResult.id ?? submitResult.task_id;
  if (!taskId) throw new Error('No task ID returned: ' + JSON.stringify(submitResult));
  console.log(`  ✓ task ID: ${taskId}`);

  // 4. Poll for completion
  console.log('\n4. Polling for result…');
  const POLL_MS      = 5_000;
  const MAX_POLLS    = 120; // 10 minutes max
  let   resultUrl    = null;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, POLL_MS));
    const elapsed = ((i + 1) * POLL_MS / 1000).toFixed(0);

    const status = await tregCall('reapi.tasks.get', { query: { task_id: taskId } });
    const state  = status.status ?? 'unknown';
    process.stdout.write(`  [${elapsed}s] status: ${state}\r`);

    if (state === 'completed') {
      resultUrl = status.output?.video_urls?.[0] ?? status.output?.video_url ?? null;
      console.log(`\n  ✓ completed! video: ${resultUrl?.slice(0, 70)}…`);
      break;
    }
    if (state === 'failed') {
      const err = typeof status.error === 'string' ? status.error : JSON.stringify(status.error);
      throw new Error(`Task failed: ${err}`);
    }
  }

  if (!resultUrl) throw new Error('Timed out waiting for video');

  // 5. Download output video
  console.log('\n5. Downloading output video…');
  const videoRes = await fetch(resultUrl);
  if (!videoRes.ok) throw new Error(`Download failed: ${videoRes.status}`);
  const videoOut = Buffer.from(await videoRes.arrayBuffer());
  await writeFile(OUTPUT_PATH, videoOut);

  console.log(`\n✅ Done! Saved to: ${OUTPUT_PATH}`);
  console.log(`   Size: ${(videoOut.length / 1024 / 1024).toFixed(1)} MB\n`);
}

main().catch((err) => { console.error('\n❌ Error:', err.message); process.exit(1); });
