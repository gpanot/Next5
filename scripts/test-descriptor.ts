/**
 * Asset descriptor smoke test v6 — thin harness
 *
 * All pipeline logic (measurement, prompts, Gemini, validation, rights, DB write)
 * lives in src/server/labs/assetDescriptor/ and is imported here.
 * This script only handles:
 *   - R2 download
 *   - Asset list / test metadata
 *   - Console report
 *   - DB write (calls writeVideo / writeMusic from the module)
 *
 * Run: npx tsx -r dotenv/config scripts/test-descriptor.ts dotenv_config_path=.env.local
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

// ── Module imports ────────────────────────────────────────────────────────────
import {
  describeAsset,
  getModelName,
  lufsToDigit,
  writeVideo, writeMusic, markFailed,
} from '../src/server/labs/assetDescriptor';
import type {
  AssetKind, AssetSource, VideoDescriptor, MusicDescriptor, DescribeResult,
} from '../src/server/labs/assetDescriptor';
import { MediaResolution } from '@google/genai';

const execFileAsync = promisify(execFile);
const prisma = new PrismaClient();

const MODEL  = getModelName();
const BUCKET = process.env.R2_BUCKET_NAME ?? 'next5-photos';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// ── Startup ───────────────────────────────────────────────────────────────────

console.log(`\n🎬  Descriptor pipeline v6 (module harness)`);
console.log(`   Model: ${MODEL}  |  Resolution: HIGH (${MediaResolution.MEDIA_RESOLUTION_HIGH})`);
console.log(`   Key: ${process.env.GEMINI_API_KEY?.slice(0, 12)}…`);

// ── Test assets ───────────────────────────────────────────────────────────────

interface TestAsset {
  label: string;
  name: string;
  kind: AssetKind;
  source: AssetSource;
  sourceField: 'blitzAssetId' | 'ugcVideoId';
  id: string;
  r2Key: string;
  ext: string;
  mime: string;
  script?: string; // ugc_video only — for transcript comparison
}

const TEST_ASSETS: TestAsset[] = [
  // ── 2 Videos ──────────────────────────────────────────────────────────────
  {
    label: 'Video 1 (BACKGROUND, scraped)',
    name: 'Video 1',
    kind: 'background', source: 'scraped', sourceField: 'blitzAssetId',
    id: '3835da79-2c64-4f5a-bd0b-c76d83f89117',
    r2Key: 'blitz/videos/25a45e47ed46457188cd904d7d538b3d.mp4',
    ext: 'mp4', mime: 'video/mp4',
  },
  {
    label: 'Video 2 (BACKGROUND, scraped)',
    name: 'Video 2',
    kind: 'background', source: 'scraped', sourceField: 'blitzAssetId',
    id: 'f426a6f9-0aa3-4b59-8db2-ef7514b5746c',
    r2Key: 'blitz/videos/611d7d45081848698e797458bceb4be2.mp4',
    ext: 'mp4', mime: 'video/mp4',
  },
  // ── 2 Memes ───────────────────────────────────────────────────────────────
  {
    label: 'Meme 10 (OVERLAY)',
    name: 'Meme 10',
    kind: 'meme', source: 'scraped', sourceField: 'blitzAssetId',
    id: 'd666f4b9-d6a4-425e-b82e-6767ff2f4f2a',
    r2Key: 'blitz/assets/5ca3dfb85389472e898c9b690c61ba2c.mp4',
    ext: 'mp4', mime: 'video/mp4',
  },
  {
    label: 'Meme 11 (OVERLAY)',
    name: 'Meme 11',
    kind: 'meme', source: 'scraped', sourceField: 'blitzAssetId',
    id: '24cfa439-ae2e-42b9-98be-3bea4ce0445b',
    r2Key: 'blitz/assets/b12212e5e62a48c4912b54d32140f083.mp4',
    ext: 'mp4', mime: 'video/mp4',
  },
  // ── 2 Sounds ──────────────────────────────────────────────────────────────
  {
    label: 'Sound: "about this" (AUDIO)',
    name: 'about this',
    kind: 'music', source: 'uploaded', sourceField: 'blitzAssetId',
    id: 'ff2cd075-f1a9-460f-afc6-33649de18878',
    r2Key: 'blitz/audio/about_this.mp3',
    ext: 'mp3', mime: 'audio/mpeg',
  },
  {
    label: 'Sound: "all about" (AUDIO)',
    name: 'all about',
    kind: 'music', source: 'uploaded', sourceField: 'blitzAssetId',
    id: '8905c736-6e4e-41fa-8cb7-d3e45f974f35',
    r2Key: 'blitz/audio/all_about.mp3',
    ext: 'mp3', mime: 'audio/mpeg',
  },
];

// ── R2 download ───────────────────────────────────────────────────────────────

async function downloadFromR2(key: string, dest: string): Promise<void> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!res.Body) throw new Error(`Empty R2 body: ${key}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const chunks: Uint8Array[] = [];
  for await (const c of res.Body as AsyncIterable<Uint8Array>) chunks.push(c);
  fs.writeFileSync(dest, Buffer.concat(chunks));
}

// ── DB write (delegates to module) ───────────────────────────────────────────

async function writeResult(asset: TestAsset, result: DescribeResult): Promise<void> {
  const source = asset.sourceField === 'ugcVideoId'
    ? { ugcVideoId: asset.id }
    : { blitzAssetId: asset.id };

  if (asset.kind === 'music') {
    await writeMusic(source, asset.source, result.descriptor as MusicDescriptor,
      result.durationSec, result.loudDigits);
  } else {
    await writeVideo(source, asset.kind, asset.source, result.descriptor as VideoDescriptor,
      result.durationSec, result.cuts, result.loudDigits);
  }
}

// ── Per-asset runner ──────────────────────────────────────────────────────────

interface TestResult {
  label: string; success: boolean; error?: string;
  describe?: DescribeResult;
  fileMb?: number; fps?: number;
  asset?: TestAsset;
}

async function runTest(asset: TestAsset): Promise<TestResult> {
  const tmpDir = path.join(os.tmpdir(), `desc6_${asset.id.slice(0, 8)}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const filePath = path.join(tmpDir, `source.${asset.ext}`);

  console.log(`\n${'='.repeat(68)}`);
  console.log(`▶  ${asset.label}  [${asset.kind}] source=${asset.source}`);

  try {
    // Download
    process.stdout.write('   [1] Download…   ');
    await downloadFromR2(asset.r2Key, filePath);
    const fileMb = fs.statSync(filePath).size / 1024 / 1024;
    console.log(`✓ ${fileMb.toFixed(2)} MB`);

    // Describe (all logic in module)
    process.stdout.write('   [2] Probing + measuring…\n');
    const result = await describeAsset({
      filePath, kind: asset.kind, source: asset.source,
      name: asset.name, mimeType: asset.mime, ext: asset.ext,
    });

    // Log summary line
    const loudDisplay = result.loudFlat
      ? '(flat — omitted)'
      : `"${result.loudDigits.slice(0, 30)}${result.loudDigits.length > 30 ? '…' : ''}"`;
    const relDisplay = result.loudRelDigits
      ? ` rel="${result.loudRelDigits.slice(0, 30)}${result.loudRelDigits.length > 30 ? '…' : ''}"`
      : '';
    console.log(`   ✓ ${result.cuts.length} cuts  loudness=${loudDisplay}${relDisplay}`);
    console.log(`   ✓ ${result.wallMs}ms  in=${result.usageTotal}(vid=${result.usageVideo} aud=${result.usageAudio}) out=${result.usageOut}${result.tokPerFrame ? `  ${result.tokPerFrame}tok/frame` : ''}${result.retries ? `  [${result.retries} retries]` : ''}`);
    if (result.repaired) console.log('   🔧 Repaired');

    // DB write
    await writeResult(asset, result);
    console.log('   ✅ Written');

    return { label: asset.label, success: true, describe: result, fileMb, asset };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`   ❌ FAILED: ${msg.slice(0, 250)}`);
    const source = asset.sourceField === 'ugcVideoId'
      ? { ugcVideoId: asset.id }
      : { blitzAssetId: asset.id };
    await markFailed(source, asset.kind, asset.source, msg.slice(0, 500)).catch(() => {});
    return { label: asset.label, success: false, error: msg };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ── Loudness unit test ────────────────────────────────────────────────────────

function runLoudnessUnitTest() {
  const cases: [number, number][] = [[-40, 0], [-30, 3], [-14, 7], [-5, 9]];
  let ok = true;
  for (const [lufs, expected] of cases) {
    const got = lufsToDigit(lufs);
    if (got !== expected) { console.error(`  FAIL lufsToDigit(${lufs})=${got} expected ${expected}`); ok = false; }
  }
  if (ok) console.log('  ✓  lufsToDigit unit test: [-40,-30,-14,-5] → [0,3,7,9]');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.GEMINI_API_KEY) { console.error('❌  GEMINI_API_KEY not set'); process.exit(1); }

  console.log('\n── Loudness unit test ──────────────────────────────────');
  runLoudnessUnitTest();

  const results: TestResult[] = [];
  for (const asset of TEST_ASSETS) results.push(await runTest(asset));

  // ── Fetch effective_rights_risk from DB for summary ──
  const ids = TEST_ASSETS.filter(a => a.sourceField === 'blitzAssetId').map(a => a.id);
  const ugcIds = TEST_ASSETS.filter(a => a.sourceField === 'ugcVideoId').map(a => a.id);
  const dbRows = await prisma.assetDescriptor.findMany({
    where: {
      OR: [
        ...(ids.length   ? [{ blitzAssetId: { in: ids } }]   : []),
        ...(ugcIds.length ? [{ ugcVideoId:   { in: ugcIds } }] : []),
      ],
    },
    select: {
      blitzAssetId: true, ugcVideoId: true,
      rightsRisk: true, rightsRiskOverride: true, effectiveRightsRisk: true,
    },
  });
  const effectiveMap = new Map<string, string | null>();
  for (const r of dbRows) {
    const key = r.blitzAssetId ?? r.ugcVideoId ?? '';
    effectiveMap.set(key, r.effectiveRightsRisk ?? null);
  }

  // ── Summary ──
  console.log(`\n${'='.repeat(68)}`);
  console.log('📊  SUMMARY  (v6 — module harness, relative loudness for music, effective_rights_risk column)');
  console.log('='.repeat(68));

  let totalCost = 0, totalSec = 0;
  for (const r of results) {
    console.log(`\n${r.success ? '✅' : '❌'}  ${r.label}`);
    if (!r.success) { console.log(`    Error: ${r.error?.slice(0, 200)}`); continue; }

    const dr = r.describe!;
    const d  = dr.descriptor;
    const asset = r.asset!;
    const isMusic = asset.kind === 'music';
    const costEst = (dr.usageTotal * 0.15 + dr.usageOut * 0.60) / 1_000_000;
    const effectiveRisk = effectiveMap.get(asset.id) ?? '(not in DB)';

    console.log(`    File: ${r.fileMb?.toFixed(2)} MB${dr.tokPerFrame ? `  fps=${asset.kind !== 'music' ? (dr.durationSec <= 10 ? 5 : dr.durationSec <= 20 ? 3 : 2) : '—'}` : ''}  Duration: ${dr.durationSec.toFixed(2)}s`);
    console.log(`    Tokens in: ${dr.usageTotal} (vid=${dr.usageVideo} aud=${dr.usageAudio}) out: ${dr.usageOut}${dr.tokPerFrame ? `  → ${dr.tokPerFrame} tok/frame` : ''}`);
    console.log(`    Cost est: ~$${costEst.toFixed(5)}  Wall: ${(dr.wallMs / 1000).toFixed(1)}s  Retries: ${dr.retries}`);
    if (dr.repaired) console.log('    Repair: fired');

    const absDisplay  = dr.loudFlat ? '(flat — omitted)' : dr.loudDigits;
    const relDisplay  = dr.loudRelDigits || (isMusic ? '(range < 1 LU — omitted)' : 'N/A');
    console.log(`    Loudness abs: ${absDisplay}`);
    if (isMusic) console.log(`    Loudness rel: ${relDisplay}`);

    if (isMusic) {
      const m = d as MusicDescriptor;
      console.log(`\n    sound         : ${m.sound}`);
      console.log(`    emotion       : ${m.emotion}`);
      console.log(`    imagery       : ${m.imagery}`);
      console.log(`    vibe          : ${m.vibe?.join(', ')}`);
      console.log(`    fitsStructures: ${m.fitsStructures?.join(', ')}`);
      console.log(`    sections      : ${m.sections?.map(s => `${s.label}[${s.start}–${s.end}s,${s.energy}]`).join(', ')}`);
      console.log(`    dropAt        : ${m.dropAt ?? 'null'}  bestStart: ${m.bestStart}s  bpmEstimate: ${m.bpmEstimate ?? 'null'}`);
      console.log(`    rightsRisk    : ${m.rightsRisk}  (set by: ${dr.rightsSetBy})`);
      console.log(`    effectiveRisk : ${effectiveRisk}  (from DB generated column)`);
      console.log(`    niche         : realtor=${m.nicheScores?.realtor?.toFixed(2)}  tiktokShop=${m.nicheScores?.tiktokShop?.toFixed(2)}`);
      console.log(`    retrievalText : "${m.retrievalText?.slice(0, 120)}"`);
    } else {
      const v = d as VideoDescriptor;
      console.log(`\n    subject       : ${v.subject}`);
      console.log(`    action        : ${v.action}`);
      console.log(`    emotion.face  : ${v.emotion?.face}`);
      console.log(`    emotion.voice : ${v.emotion?.voice ?? 'null'}`);
      console.log(`    meaning       : ${v.meaning}`);
      console.log(`    bestUse       : ${v.bestUse}`);
      console.log(`    vibe          : ${v.vibe?.join(', ')}`);
      console.log(`    peakAt        : ${v.peakAt}s  bestTrim: [${v.bestTrim?.start}–${v.bestTrim?.end}s]`);
      console.log(`    slotScores    : hook=${v.slotScores?.hook?.toFixed(2)} prob=${v.slotScores?.problem?.toFixed(2)} proof=${v.slotScores?.proof?.toFixed(2)} payoff=${v.slotScores?.payoff?.toFixed(2)} cta=${v.slotScores?.cta?.toFixed(2)}`);
      console.log(`    niche         : realtor=${v.nicheScores?.realtor?.toFixed(2)}  tiktokShop=${v.nicheScores?.tiktokShop?.toFixed(2)}`);
      console.log(`    hasSpeech     : ${v.hasSpeech}  transcript: "${v.transcript ?? ''}"`);
      console.log(`    rightsRisk    : ${v.rightsRisk}  identifiable: ${v.identifiablePerson}  publicFigure: ${v.publicFigureLikely}  (set by: ${dr.rightsSetBy})`);
      console.log(`    effectiveRisk : ${effectiveRisk}  (from DB generated column)`);
      console.log(`    textSafeZone  : ${v.textSafeZone}  pacing: ${v.pacing}  energy: ${v.energyLevel}`);
      console.log(`    avoidFor      : ${v.avoidFor?.join(', ') || 'none'}`);
      console.log(`    retrievalText : "${v.retrievalText?.slice(0, 120)}"`);

      // UGC transcript check
      if (asset.script) {
        console.log(`\n    ── Audio/transcript check ───────────────────────────`);
        console.log(`    Script    : "${asset.script}"`);
        console.log(`    Transcript: "${v.transcript ?? '(empty)'}"`);
        const scriptWords     = asset.script.toLowerCase().split(/\s+/);
        const transcriptWords = (v.transcript ?? '').toLowerCase().split(/\s+/).filter(Boolean);
        const overlap = scriptWords.filter(w => transcriptWords.includes(w)).length;
        const pct = scriptWords.length > 0 ? Math.round(overlap / scriptWords.length * 100) : 0;
        console.log(`    Word match: ${overlap}/${scriptWords.length} (${pct}%)`);
        if (!v.transcript || v.transcript.trim() === '') {
          console.log('    ⚠  TRANSCRIPT EMPTY — audio track not reaching model');
        } else if (pct < 50) {
          console.log(`    ⚠  LOW MATCH (${pct}%) — possible audio issue or heavily paraphrased`);
        } else {
          console.log('    ✓  Match OK');
        }
      }
    }

    totalCost += costEst;
    totalSec  += dr.wallMs / 1000;
  }

  console.log(`\n${'─'.repeat(68)}`);
  console.log(`Total cost est  : ~$${totalCost.toFixed(5)}`);
  console.log(`Total wall time : ${totalSec.toFixed(1)}s\n`);

  await prisma.$disconnect();
}

main().catch(async e => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
