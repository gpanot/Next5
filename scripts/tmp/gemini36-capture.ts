// Temporary: runs every Gemini Flash call site once on real Blitz assets and saves the exact chat request bodies.
// gemini36-replay.ts then replays them on other models / reasoning levels / providers.
// Run: npx tsx --env-file=.env.local scripts/tmp/gemini36-capture.ts <out.json>
/* eslint-disable no-console */
import fs from 'node:fs';
import sharp from 'sharp';

const BACKGROUNDS = [
  'blitz/assets/8f9690ff5f4e4a56b2c9eba9f93749d3.jpg', // woman in office on phone
  'blitz/uploads/background/1790302063191-vc9nbbfhffi.jpg', // listing photo
  'blitz/uploads/background/1790223971125-o3loliy7cbf.jpg', // happy person with phone
];
const OVERLAY = 'blitz/assets/6f00601ca0a749d1b7ee73e95613336e.mp4';
const CAPTION = 'POV: you finally listed your house in 3 days';

type Captured = { task: string; body: Record<string, unknown> };
const captured: Captured[] = [];
let task = 'unknown';

const realFetch = globalThis.fetch;
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.includes('openrouter.ai') && typeof init?.body === 'string') {
    captured.push({ task, body: JSON.parse(init.body) as Record<string, unknown> });
  }
  return realFetch(input, init);
};

const run = async (name: string, fn: () => Promise<unknown>) => {
  task = name;
  const t = Date.now();
  const out = await fn().catch((err: unknown) => `ERROR ${err instanceof Error ? err.message : String(err)}`);
  console.log(`${name} (${Date.now() - t} ms):`, JSON.stringify(out).slice(0, 200));
};

async function main() {
  const outPath = process.argv[2];
  if (!outPath) throw new Error('usage: gemini36-capture.ts <out.json>');
  const { getObjectBuffer } = await import('../../src/lib/r2');
  const { autoFitBlitz } = await import('../../src/server/labs/blitzAutoFit');
  const { fitHook } = await import('../../src/server/shorts/hookFit');
  const { withSlideCameras } = await import('../../src/server/labs/blitzCamera');
  const { remixBlitz } = await import('../../src/server/labs/blitzRemix');
  const { generatePortraitJson } = await import('../../src/server/admin/portraitClone');
  const { detectHeads } = await import('../../src/server/autoSlideshow/heads');

  const frames: Buffer[] = [];
  for (const key of BACKGROUNDS) {
    const raw = await getObjectBuffer(key);
    if (!raw) throw new Error(`missing ${key}`);
    frames.push(await sharp(raw).resize(1080, 1920, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer());
  }
  const uri = (b: Buffer) => `data:image/jpeg;base64,${b.toString('base64')}`;

  for (const [i, frame] of frames.entries()) {
    await run(`autofit#${i}`, () => autoFitBlitz({
      backgroundJpeg: uri(frame),
      compositeJpeg: uri(frame),
      captionText: CAPTION,
      layout: {
        subjectBase: { x: 140, y: 900, w: 800, h: 1020 },
        subjectNow: { x: 140, y: 900, w: 800, h: 1020 },
        caption: { x: 90, y: 300, w: 900, h: 220 },
        business: null,
      },
    }));
    await run(`hook#${i}`, () => fitHook(frame, 'Stop pricing your home like this', async () => frame));
    await run(`heads#${i}`, () => detectHeads(uri(frame)));
  }
  await run('camera', () => withSlideCameras(BACKGROUNDS.map((k, i) => ({ text: `${CAPTION} (${i + 1})`, backgroundKey: k })), 0.7));
  await run('remix', () => remixBlitz({ locked: ['background'], captionText: CAPTION, overlayKey: OVERLAY, backgroundKey: BACKGROUNDS[1]! }));
  await run('portrait', () => generatePortraitJson(uri(frames[2]!), 'test_person'));

  fs.writeFileSync(outPath, JSON.stringify(captured));
  console.log(`saved ${captured.length} requests to ${outPath}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
