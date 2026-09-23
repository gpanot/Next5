/**
 * Blitz Lab seed script
 *
 * Usage:
 *   DATABASE_URL=... tsx -r dotenv/config scripts/seed-blitz.ts dotenv_config_path=.env.local
 *   -- OR --
 *   npm run db:seed:blitz
 *
 * What it does:
 *   1. Inserts one GREEN_SCREEN BlitzTemplate.
 *   2. Inserts placeholder BlitzAsset rows for BACKGROUND and OVERLAY.
 *      The R2 keys are placeholders — see instructions below for uploading
 *      the actual files to R2 before using Blitz Lab.
 *
 * Asset requirements:
 *   OVERLAY  — must be a pre-keyed WebM file with VP9 alpha channel.
 *              Convert any MP4/MOV to alpha WebM with:
 *              ffmpeg -i input.mp4 -c:v libvpx-vp9 -b:v 0 -crf 30 \
 *                     -auto-alt-ref 0 -vf "chromakey=color=0x00FF00:similarity=0.3" \
 *                     output.webm
 *              Upload to R2 at: blitz/assets/<id>.webm
 *   BACKGROUND — any image (JPEG/PNG/WebP) or short video.
 *              Upload to R2 at: blitz/assets/<id>.jpg
 *
 * To upload assets via AWS CLI (using R2 endpoint):
 *   aws s3 cp overlay.webm s3://next5-photos/blitz/assets/overlay-001.webm \
 *     --endpoint-url https://<account-id>.r2.cloudflarestorage.com
 */

import { PrismaClient } from '@prisma/client';
import { BLITZ_DEFAULT_TEXT_CONFIG, BLITZ_DEFAULT_DURATION_S, BLITZ_DEFAULT_FPS } from '../src/config/blitzLab';

const prisma = new PrismaClient();

const TEMPLATE_ID = 'blitz-tmpl-green-screen-v0';
const CAROUSEL_TEMPLATE_ID = 'blitz-tmpl-carousel-v0';
const OVERLAY_ASSET_ID  = 'blitz-asset-overlay-001';
const BG_ASSET_ID       = 'blitz-asset-bg-001';

// ── Adjust these R2 keys to match the files you actually upload ───────────────
const OVERLAY_R2_KEY  = 'blitz/assets/overlay-001.webm';   // VP9-alpha WebM
const BG_R2_KEY       = 'blitz/assets/bg-001.jpg';         // Background image

async function seed() {
  console.log('[seed-blitz] Seeding Blitz Lab template and assets…');

  // ── Template ─────────────────────────────────────────────────────────────
  const template = await prisma.blitzTemplate.upsert({
    where: { id: TEMPLATE_ID },
    update: {},
    create: {
      id: TEMPLATE_ID,
      name: 'Green Screen — Real Estate v0',
      type: 'GREEN_SCREEN',
      defaultAssets: {
        // Store R2 keys (not DB IDs) — BlitzLabTab.buildInputProps looks up by r2Key
        backgroundKey: BG_R2_KEY,
        overlayKey: OVERLAY_R2_KEY,
      },
      textConfig: BLITZ_DEFAULT_TEXT_CONFIG,
      defaultHookText: "You're gonna FALL in love with this one 🏡",
      remixPrompt: 'Write a punchy real-estate hook that creates urgency and invites the viewer to DM for details.',
      durationSeconds: BLITZ_DEFAULT_DURATION_S,
      fps: BLITZ_DEFAULT_FPS,
    },
  });
  console.log('[seed-blitz] Template upserted:', template.id);

  // ── CAROUSEL / Slideshow template ─────────────────────────────────────────
  const carouselTemplate = await prisma.blitzTemplate.upsert({
    where: { id: CAROUSEL_TEMPLATE_ID },
    update: {},
    create: {
      id: CAROUSEL_TEMPLATE_ID,
      name: 'Slideshow',
      type: 'CAROUSEL',
      defaultAssets: {
        // No overlayKey — Slideshow has no meme/green-screen layer
        backgroundKey: BG_R2_KEY,
      },
      textConfig: BLITZ_DEFAULT_TEXT_CONFIG,
      defaultHookText: 'You are gonna FALL in love with this one 🏡',
      remixPrompt: 'Write a punchy real-estate hook that creates urgency and invites the viewer to DM for details.',
      durationSeconds: 15.0,
      fps: BLITZ_DEFAULT_FPS,
    },
  });
  console.log('[seed-blitz] Carousel template upserted:', carouselTemplate.id);

  // ── Overlay asset ─────────────────────────────────────────────────────────
  const overlay = await prisma.blitzAsset.upsert({
    where: { id: OVERLAY_ASSET_ID },
    update: {},
    create: {
      id: OVERLAY_ASSET_ID,
      name: 'Margie — Real estate reaction (alpha WebM)',
      type: 'OVERLAY',
      r2Key: OVERLAY_R2_KEY,
    },
  });
  console.log('[seed-blitz] Overlay asset upserted:', overlay.id, '→', overlay.r2Key);

  // ── Background asset ──────────────────────────────────────────────────────
  const bg = await prisma.blitzAsset.upsert({
    where: { id: BG_ASSET_ID },
    update: {},
    create: {
      id: BG_ASSET_ID,
      name: 'Suburban home exterior',
      type: 'BACKGROUND',
      r2Key: BG_R2_KEY,
    },
  });
  console.log('[seed-blitz] Background asset upserted:', bg.id, '→', bg.r2Key);

  console.log('\n[seed-blitz] ✓ Done.\n');
  console.log('⚠  Next steps — upload the actual files to R2:');
  console.log(`   Overlay (VP9-alpha WebM) → ${OVERLAY_R2_KEY}`);
  console.log(`   Background image/video   → ${BG_R2_KEY}`);
  console.log('\n   Convert an MP4 overlay to VP9-alpha WebM (green-screen source):');
  console.log('   ffmpeg -i source.mp4 -c:v libvpx-vp9 -b:v 0 -crf 30 -auto-alt-ref 0 \\');
  console.log('          -vf "chromakey=color=0x00FF00:similarity=0.3:blend=0.05" \\');
  console.log('          overlay-001.webm');
  console.log('\n   Then upload:');
  console.log('   aws s3 cp overlay-001.webm s3://next5-photos/blitz/assets/overlay-001.webm \\');
  console.log('     --endpoint-url https://<account-id>.r2.cloudflarestorage.com');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
