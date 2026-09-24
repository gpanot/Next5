/**
 * scripts/run-descriptors.ts
 *
 * Production batch runner for the asset descriptor pipeline.
 * Processes all BACKGROUND videos and OVERLAY memes that don't yet have a
 * "done" descriptor, in parallel batches of CONCURRENCY=3.
 *
 * Hard cost cap: $4.00 (configurable via --cap flag or DESCRIPTOR_CAP env var).
 * Cost model (Gemini 3.1 Flash Lite as of 2026):
 *   $0.15/M tokens input + $0.60/M tokens output
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/run-descriptors.ts dotenv_config_path=.env.local
 *   npx tsx -r dotenv/config scripts/run-descriptors.ts dotenv_config_path=.env.local --cap=2.00
 *   npx tsx -r dotenv/config scripts/run-descriptors.ts dotenv_config_path=.env.local --dry-run
 *
 * Flags:
 *   --cap=N       Cost hard cap in USD (default: 4.00)
 *   --dry-run     List assets that would be processed, print estimate, then exit
 *   --videos-only Only process BACKGROUND videos
 *   --memes-only  Only process OVERLAY memes
 *   --concurrency=N Parallel workers (default: 3)
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

import {
  describeAsset,
  getModelName,
  writeVideo, markFailed,
} from '../src/server/labs/assetDescriptor';
import type { AssetKind, AssetSource, DescribeResult } from '../src/server/labs/assetDescriptor';

const execFileAsync = promisify(execFile);
const prisma = new PrismaClient();

// ── CLI flags ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const capFlag   = args.find(a => a.startsWith('--cap='));
const concFlag  = args.find(a => a.startsWith('--concurrency='));
const limitFlag = args.find(a => a.startsWith('--limit='));
const DRY_RUN         = args.includes('--dry-run');
const VIDEOS_ONLY     = args.includes('--videos-only');
const MEMES_ONLY      = args.includes('--memes-only');
const USE_OPENROUTER  = args.includes('--openrouter') || process.env.FORCE_OPENROUTER === '1';
const CAP_USD         = capFlag   ? parseFloat(capFlag.split('=')[1]!)   : parseFloat(process.env.DESCRIPTOR_CAP ?? '4.00');
const CONCURRENCY     = concFlag  ? parseInt(concFlag.split('=')[1]!, 10) : 3;
const LIMIT           = limitFlag ? parseInt(limitFlag.split('=')[1]!, 10) : Infinity;

// Tell gemini.ts to use OpenRouter
if (USE_OPENROUTER) process.env.FORCE_OPENROUTER = '1';

// Cost model (Gemini 3.1 Flash Lite)
const COST_PER_M_IN  = 0.15;
const COST_PER_M_OUT = 0.60;

// Average cost estimate per asset type (from pilot run)
const AVG_COST_VIDEO = 0.00177; // ~7920 tok in, ~700 tok out (6s 9:16)
const AVG_COST_MEME  = 0.00193; // ~8800 tok in, ~850 tok out

// ── R2 ────────────────────────────────────────────────────────────────────────

const BUCKET = process.env.R2_BUCKET_NAME ?? 'next5-photos';
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function downloadFromR2(key: string, dest: string): Promise<void> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!res.Body) throw new Error(`Empty R2 body: ${key}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const chunks: Uint8Array[] = [];
  for await (const c of res.Body as AsyncIterable<Uint8Array>) chunks.push(c);
  fs.writeFileSync(dest, Buffer.concat(chunks));
}

// ── Asset queue ───────────────────────────────────────────────────────────────

interface QueueItem {
  id: string;
  name: string;
  r2Key: string;
  kind: AssetKind;
  source: AssetSource;
  estimatedCost: number;
}

async function buildQueue(): Promise<QueueItem[]> {
  const videoExts = ['.mp4', '.mov', '.webm'];

  const [bgAssets, overlayAssets] = await Promise.all([
    MEMES_ONLY ? Promise.resolve([]) : prisma.blitzAsset.findMany({
      where: { type: 'BACKGROUND' },
      select: { id: true, name: true, r2Key: true },
      orderBy: { createdAt: 'asc' },
    }),
    VIDEOS_ONLY ? Promise.resolve([]) : prisma.blitzAsset.findMany({
      where: { type: 'OVERLAY' },
      select: { id: true, name: true, r2Key: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Filter BG to videos only (not images)
  const videos = bgAssets.filter(a => videoExts.some(e => a.r2Key.toLowerCase().endsWith(e)));
  const memes  = overlayAssets;

  // Find existing done descriptors
  const allIds = [...videos, ...memes].map(a => a.id);
  const existingDone = await prisma.assetDescriptor.findMany({
    where: { blitzAssetId: { in: allIds }, status: 'done' },
    select: { blitzAssetId: true },
  });
  const doneSet = new Set(existingDone.map(d => d.blitzAssetId!));

  const queue: QueueItem[] = [
    ...videos.filter(a => !doneSet.has(a.id)).map(a => ({
      id: a.id, name: a.name, r2Key: a.r2Key,
      kind: 'background' as AssetKind, source: 'scraped' as AssetSource,
      estimatedCost: AVG_COST_VIDEO,
    })),
    ...memes.filter(a => !doneSet.has(a.id)).map(a => ({
      id: a.id, name: a.name, r2Key: a.r2Key,
      kind: 'meme' as AssetKind, source: 'scraped' as AssetSource,
      estimatedCost: AVG_COST_MEME,
    })),
  ];

  return queue;
}

// ── Process one asset ─────────────────────────────────────────────────────────

interface RunResult {
  id: string;
  name: string;
  kind: string;
  success: boolean;
  costUsd: number;
  wallMs: number;
  error?: string;
}

async function processOne(item: QueueItem): Promise<RunResult> {
  const tmpDir = path.join(os.tmpdir(), `desc_batch_${item.id.slice(0, 12)}`);
  const tmpFile = path.join(tmpDir, `source.${item.r2Key.split('.').pop()}`);
  const start = Date.now();

  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    await downloadFromR2(item.r2Key, tmpFile);

    const ext = item.r2Key.split('.').pop()?.toLowerCase() ?? 'mp4';
    const mimeType = ext === 'webm' ? 'video/webm' : ext === 'mov' ? 'video/quicktime' : 'video/mp4';

    const result: DescribeResult = await describeAsset({
      filePath: tmpFile,
      kind: item.kind,
      source: item.source,
      name: item.name,
      mimeType,
      ext,
    });

    const desc = result.descriptor;
    // All BACKGROUND + OVERLAY assets are video descriptors
    await writeVideo(
      { blitzAssetId: item.id },
      item.kind,
      item.source,
      desc as Parameters<typeof writeVideo>[3],
      result.durationSec,
      result.cuts,
      result.loudDigits,
    );

    const costUsd = (result.usageTotal * COST_PER_M_IN + result.usageOut * COST_PER_M_OUT) / 1_000_000;
    return { id: item.id, name: item.name, kind: item.kind, success: true, costUsd, wallMs: Date.now() - start };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markFailed({ blitzAssetId: item.id }, item.kind, item.source, msg.slice(0, 500)).catch(() => {});
    return { id: item.id, name: item.name, kind: item.kind, success: false, costUsd: 0, wallMs: Date.now() - start, error: msg.slice(0, 120) };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ── Concurrency pool ──────────────────────────────────────────────────────────

async function runWithPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, idx: number) => Promise<RunResult>,
  onResult: (r: RunResult, idx: number, total: number) => boolean, // return false to stop
): Promise<RunResult[]> {
  const results: RunResult[] = [];
  let idx = 0;
  let stop = false;

  async function worker() {
    while (!stop && idx < items.length) {
      const myIdx = idx++;
      const r = await fn(items[myIdx]!, myIdx);
      results.push(r);
      if (!onResult(r, myIdx, items.length)) { stop = true; }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌  GEMINI_API_KEY not set');
    process.exit(1);
  }

  console.log(`\n🚀  Descriptor batch runner`);
  console.log(`   Model       : ${getModelName()}`);
  console.log(`   Hard cap    : $${CAP_USD.toFixed(2)}`);
  console.log(`   Concurrency : ${CONCURRENCY}`);
  console.log(`   Provider    : ${USE_OPENROUTER ? 'OpenRouter (google/gemini-3.1-flash-lite)' : 'Google Gemini API'}`);
  console.log(`   Mode        : ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  if (VIDEOS_ONLY) console.log('   Filter      : videos only');
  if (MEMES_ONLY)  console.log('   Filter      : memes only');

  console.log('\n📋  Building queue…');
  const fullQueue = await buildQueue();
  const queue = Number.isFinite(LIMIT) ? fullQueue.slice(0, LIMIT) : fullQueue;
  const totalEst = queue.reduce((s, a) => s + a.estimatedCost, 0);
  const videos = queue.filter(a => a.kind === 'background').length;
  const memes  = queue.filter(a => a.kind === 'meme').length;

  console.log(`   Videos to describe : ${videos}`);
  console.log(`   Memes  to describe : ${memes}`);
  console.log(`   Total              : ${queue.length}${Number.isFinite(LIMIT) ? ` (limit: ${LIMIT} of ${fullQueue.length})` : ''}`);
  console.log(`   Estimated cost     : ~$${totalEst.toFixed(4)}`);
  console.log(`   Hard cap           : $${CAP_USD.toFixed(2)}`);

  if (DRY_RUN) {
    console.log('\n⏭  DRY RUN — no API calls made.');
    if (totalEst > CAP_USD) {
      const safeCount = Math.floor(CAP_USD / (totalEst / queue.length));
      console.log(`   Cap would stop after ~${safeCount} assets.`);
    }
    await prisma.$disconnect();
    return;
  }

  if (queue.length === 0) {
    console.log('\n✅  All assets already described — nothing to do.');
    await prisma.$disconnect();
    return;
  }

  console.log('\n⚡  Running…\n');

  let totalCost = 0;
  let done = 0;
  let failed = 0;
  let capHit = false;
  const startAll = Date.now();

  const results = await runWithPool(queue, CONCURRENCY, processOne, (r, _, total) => {
    done++;
    totalCost += r.costUsd;
    const icon  = r.success ? '✅' : '❌';
    const badge = `[${String(done).padStart(3)}/${total}]`;
    const cost  = `$${totalCost.toFixed(4)} spent`;

    if (r.success) {
      console.log(`${icon} ${badge} ${r.kind.padEnd(10)} ${r.name.slice(0, 50).padEnd(50)} +$${r.costUsd.toFixed(5)}  ${cost}  ${(r.wallMs/1000).toFixed(1)}s`);
    } else {
      failed++;
      console.log(`${icon} ${badge} ${r.kind.padEnd(10)} ${r.name.slice(0, 50).padEnd(50)} FAILED: ${r.error}`);
    }

    if (totalCost >= CAP_USD) {
      console.log(`\n🛑  HARD CAP HIT ($${CAP_USD.toFixed(2)}) — stopping after ${done} assets.`);
      capHit = true;
      return false; // stop
    }
    return true;
  });

  const wallSec = (Date.now() - startAll) / 1000;
  const succeeded = results.filter(r => r.success).length;

  console.log(`\n${'═'.repeat(72)}`);
  console.log('📊  BATCH SUMMARY');
  console.log('═'.repeat(72));
  console.log(`   Processed   : ${done} / ${queue.length} assets`);
  console.log(`   Succeeded   : ${succeeded}`);
  console.log(`   Failed      : ${failed}`);
  console.log(`   Total cost  : $${totalCost.toFixed(5)}`);
  console.log(`   Wall time   : ${(wallSec/60).toFixed(1)} min`);
  console.log(`   Cap         : $${CAP_USD.toFixed(2)} ${capHit ? '← HIT' : '← not reached'}`);
  if (queue.length - done > 0) {
    console.log(`   Remaining   : ${queue.length - done} assets (~$${((queue.length - done) * (totalEst / queue.length)).toFixed(4)} est)`);
  }

  await prisma.$disconnect();
}

main().catch(async e => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
