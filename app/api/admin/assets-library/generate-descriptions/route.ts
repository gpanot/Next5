import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { prisma } from '../../../../../src/lib/db';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import {
  describeAsset,
  writeVideo,
  markFailed,
} from '../../../../../src/server/labs/assetDescriptor';
import type { AssetKind, AssetSource } from '../../../../../src/server/labs/assetDescriptor';

/**
 * POST /api/admin/assets-library/generate-descriptions
 *
 * Body: { section: 'memes' | 'videos' | 'hookVideos' | 'sounds', assetId?: string }
 *
 * - If assetId is provided: describes that single asset immediately (foreground, SSE stream).
 * - If no assetId: returns a JSON list of asset IDs that don't have a 'done' descriptor yet
 *   (used by the UI to know how many need processing before kicking off individual calls).
 *
 * The UI calls this once to get the list, then fires individual POST requests per asset
 * with a concurrency limit of 2 — keeping the work entirely client-driven so it survives
 * tab switches and doesn't need a background worker.
 */

const SECTION_TYPE: Record<string, { type: string; kind: AssetKind }> = {
  memes:      { type: 'OVERLAY',     kind: 'meme'       },
  videos:     { type: 'BACKGROUND',  kind: 'background' },
  hookVideos: { type: 'HOOK',        kind: 'hook'       },
  sounds:     { type: 'AUDIO',       kind: 'music'      },
};

const BUCKET = process.env.R2_BUCKET_NAME ?? 'next5-photos';

function makeS3() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

async function downloadFromR2(key: string, dest: string): Promise<void> {
  const s3 = makeS3();
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!res.Body) throw new Error(`Empty R2 body: ${key}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const chunks: Uint8Array[] = [];
  for await (const c of res.Body as AsyncIterable<Uint8Array>) chunks.push(c);
  fs.writeFileSync(dest, Buffer.concat(chunks));
}

// ── GET — list assets without a done descriptor in a section ─────────────────

export const GET = adminRoute(async (req: NextRequest) => {
  const section = req.nextUrl.searchParams.get('section');
  if (!section || !(section in SECTION_TYPE)) {
    return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
  }

  const { type } = SECTION_TYPE[section]!;
  const videoExts = ['.mp4', '.mov', '.webm'];

  const assets = await prisma.blitzAsset.findMany({
    where: { type },
    select: { id: true, name: true, r2Key: true },
  });

  // For BACKGROUND, only videos (not images)
  const filtered = section === 'videos'
    ? assets.filter(a => videoExts.some(e => a.r2Key.toLowerCase().endsWith(e)))
    : assets;

  const described = await prisma.assetDescriptor.findMany({
    where: { blitzAssetId: { in: filtered.map(a => a.id) }, status: { in: ['done', 'failed'] } },
    select: { blitzAssetId: true, status: true },
  });
  const doneSet   = new Set(described.filter(d => d.status === 'done').map(d => d.blitzAssetId!));
  const failedSet = new Set(described.filter(d => d.status === 'failed').map(d => d.blitzAssetId!));

  // "pending" = no descriptor at all (not even failed). Failed ones shown separately.
  const pending = filtered.filter(a => !doneSet.has(a.id) && !failedSet.has(a.id));
  // "retry" = previously failed — included only if user wants to retry
  const retryable = filtered.filter(a => failedSet.has(a.id));

  return NextResponse.json({
    total: filtered.length,
    done: doneSet.size,
    failed: failedSet.size,
    pending: pending.length,
    retryable: retryable.length,
    // Assets to process: new ones first, then failed retries
    assets: [
      ...pending.map(a => ({ id: a.id, name: a.name, r2Key: a.r2Key })),
      ...retryable.map(a => ({ id: a.id, name: a.name, r2Key: a.r2Key })),
    ],
  });
});

// ── POST — describe a single asset ───────────────────────────────────────────

export const POST = adminRoute(async (req: NextRequest) => {
  // Set FORCE_OPENROUTER so gemini.ts uses OpenRouter instead of direct Google API
  process.env.FORCE_OPENROUTER = '1';

  const body = await req.json() as { section: string; assetId: string };
  const { section, assetId } = body;

  if (!section || !(section in SECTION_TYPE)) {
    return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
  }
  if (!assetId) {
    return NextResponse.json({ error: 'assetId required' }, { status: 400 });
  }

  const { kind } = SECTION_TYPE[section]!;
  const source: AssetSource = 'scraped';

  // Fetch the asset
  const asset = await prisma.blitzAsset.findUnique({
    where: { id: assetId },
    select: { id: true, name: true, r2Key: true },
  });
  if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

  // Check if already done
  const existing = await prisma.assetDescriptor.findFirst({
    where: { blitzAssetId: assetId, status: 'done' },
  });
  if (existing) {
    return NextResponse.json({ success: true, skipped: true, assetId });
  }

  const tmpDir  = path.join(os.tmpdir(), `desc_api_${assetId.slice(0, 12)}`);
  const ext     = asset.r2Key.split('.').pop()?.toLowerCase() ?? 'mp4';
  const tmpFile = path.join(tmpDir, `source.${ext}`);

  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    await downloadFromR2(asset.r2Key, tmpFile);

    const mimeType =
      ext === 'webm' ? 'video/webm' :
      ext === 'mov'  ? 'video/quicktime' :
      ext === 'mp3'  ? 'audio/mpeg' :
      ext === 'm4a'  ? 'audio/mp4' :
      ext === 'aac'  ? 'audio/aac' :
      'video/mp4';

    const result = await describeAsset({
      filePath: tmpFile,
      kind,
      source,
      name: asset.name,
      mimeType,
      ext,
    });

    await writeVideo(
      { blitzAssetId: assetId },
      kind,
      source,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result.descriptor as any,
      result.durationSec,
      result.cuts,
      result.loudDigits,
    );

    const costUsd = (result.usageTotal * 0.15 + result.usageOut * 0.60) / 1_000_000;
    return NextResponse.json({ success: true, assetId, costUsd, durationSec: result.durationSec });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markFailed({ blitzAssetId: assetId }, kind, source, msg.slice(0, 500)).catch(() => {});
    return NextResponse.json({ success: false, assetId, error: msg.slice(0, 200) }, { status: 500 });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
