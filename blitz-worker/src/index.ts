/**
 * Blitz Render Worker — Railway service
 *
 * Startup sequence:
 *   1. bundle() the Remotion composition ONCE and cache serveUrl.
 *   2. Start a polling loop that claims PENDING BlitzProject rows
 *      with a FOR UPDATE SKIP LOCKED pessimistic lock.
 *   3. For each job: render → upload to R2 → mark COMPLETED (or FAILED).
 *
 * bundle() takes 10–20 s (Webpack). Running it per-job would add that cost
 * to every render — cache it at startup instead.
 */

import 'dotenv/config';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { bundle } from '@remotion/bundler';
import { prisma } from './db';
import { renderProject } from './render';

const execFileAsync = promisify(execFile);

const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS ?? '5000', 10);

// ── Bundle composition at startup ─────────────────────────────────────────────

async function buildBundle(): Promise<string> {
  // In the Docker container the layout is:
  //   /app/blitz-worker/src/  → __dirname
  //   /app/src/remotion/      → shared Remotion composition
  // Locally (outside Docker): blitz-worker/src/ is inside next5-landing/,
  //   so ../../src/remotion/ resolves to next5-landing/src/remotion/. ✓
  const entryPoint = path.resolve(__dirname, '../../src/remotion/Root.tsx');
  console.log(`[blitz-worker] Bundling composition from: ${entryPoint}`);
  const serveUrl = await bundle({
    entryPoint,
    // In Docker the composition lives in /app/src with no node_modules above it.
    // Let webpack find packages it imports (e.g. @remotion/google-fonts) in the worker's node_modules.
    webpackOverride: (config) => ({
      ...config,
      resolve: {
        ...config.resolve,
        modules: [path.resolve(__dirname, '../node_modules'), 'node_modules'],
      },
    }),
  });
  console.log('[blitz-worker] Bundle ready:', serveUrl);
  return serveUrl;
}

// ── Claim one PENDING job with pessimistic lock ───────────────────────────────

async function claimNextJob() {
  // Raw SQL so we can use FOR UPDATE SKIP LOCKED (Prisma doesn't expose this directly).
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    UPDATE blitz_projects
    SET render_status = 'PROCESSING', updated_at = now()
    WHERE id = (
      SELECT id FROM blitz_projects
      WHERE render_status = 'PENDING'
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id
  `;
  return rows[0]?.id ?? null;
}

// ── Process one job ───────────────────────────────────────────────────────────

async function processJob(jobId: string, serveUrl: string): Promise<void> {
  console.log(`[blitz-worker] Processing job: ${jobId}`);

  const project = await prisma.blitzProject.findUnique({ where: { id: jobId } });
  if (!project) {
    console.error(`[blitz-worker] Job ${jobId} not found — skipping.`);
    return;
  }

  const template = await prisma.blitzTemplate.findUnique({
    where: { id: project.templateId },
  });
  if (!template) {
    await prisma.blitzProject.update({
      where: { id: jobId },
      data: { renderStatus: 'FAILED' },
    });
    console.error(`[blitz-worker] Template not found for job ${jobId}`);
    return;
  }

  try {
    const r2Key = await renderProject(project, template, serveUrl);
    await prisma.blitzProject.update({
      where: { id: jobId },
      data: { renderStatus: 'COMPLETED', renderedVideoKey: r2Key, updatedAt: new Date() },
    });
    console.log(`[blitz-worker] Job ${jobId} COMPLETED → ${r2Key}`);
  } catch (err) {
    console.error(`[blitz-worker] Job ${jobId} FAILED:`, err);
    await prisma.blitzProject.update({
      where: { id: jobId },
      data: { renderStatus: 'FAILED', updatedAt: new Date() },
    });
  }
}

// ── Polling loop ──────────────────────────────────────────────────────────────

async function startPollingLoop(serveUrl: string): Promise<void> {
  console.log(`[blitz-worker] Polling every ${POLL_INTERVAL_MS} ms…`);

  const tick = async () => {
    try {
      const jobId = await claimNextJob();
      if (jobId) {
        await processJob(jobId, serveUrl);
      }
    } catch (err) {
      console.error('[blitz-worker] Poll error:', err);
    }
    setTimeout(tick, POLL_INTERVAL_MS);
  };

  tick();
}

// ── Graceful shutdown & crash guards ─────────────────────────────────────────

process.on('SIGTERM', async () => {
  console.log('[blitz-worker] SIGTERM received — shutting down gracefully…');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('[blitz-worker] Uncaught exception:', err);
  // Don't exit — let the polling loop continue after this job.
});

process.on('unhandledRejection', (reason) => {
  console.error('[blitz-worker] Unhandled rejection:', reason);
});

// ── Recover jobs stuck in PROCESSING at startup ───────────────────────────────
// If the worker crashed mid-render, those rows stay PROCESSING forever.
// Reset them to PENDING so they are retried.

async function resetStuckJobs(): Promise<void> {
  const result = await prisma.$executeRaw`
    UPDATE blitz_projects
    SET render_status = 'PENDING', updated_at = now()
    WHERE render_status = 'PROCESSING'
  `;
  if (result > 0) {
    console.log(`[blitz-worker] Reset ${result} stuck PROCESSING job(s) → PENDING`);
  }
}

// ── ffmpeg self-check ─────────────────────────────────────────────────────────
//
// Generates a 2 s 440 Hz sine tone in-process (no external file needed),
// runs the ebur128 loudness filter with -v verbose, and counts M: lines.
//
// Logs:
//   [ffmpeg-check] OK   ffmpeg <version>  ebur128 M: lines=20  digits="…"
//   [ffmpeg-check] ERROR ffmpeg <version>  0 M: lines — -v verbose may not be working
//
// Zero M: lines means the worker's loudness measurement is broken.
// This does NOT abort startup — the worker can still render videos.

async function checkFfmpeg(): Promise<void> {
  const tmpFile = path.join(os.tmpdir(), `ffmpeg_selfcheck_${Date.now()}.wav`);
  try {
    // 1. Generate a 2 s sine tone
    await execFileAsync('ffmpeg', [
      '-y', '-hide_banner', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
      tmpFile,
    ]);

    // 2. Get ffmpeg version string (ffmpeg -version writes to stdout)
    const { stdout: verStdout } = await execFileAsync('ffmpeg', ['-version']).catch(() => ({ stdout: '' }));
    const versionLine = verStdout.split('\n')[0]?.replace('ffmpeg version ', '').split(' ')[0] ?? '?';

    // 3. Run ebur128 with -v verbose and count M: lines
    const { stderr } = await execFileAsync('ffmpeg', [
      '-v', 'verbose', '-hide_banner',
      '-i', tmpFile,
      '-af', 'ebur128=framelog=verbose',
      '-f', 'null', '-',
    ], { maxBuffer: 4 * 1024 * 1024 });

    const mLines = (stderr.match(/\] t:\s*[\d.]+\s+TARGET[^\n]+M:\s*[-\d.]+/g) ?? []).length;

    // 4. Map first few M: values to digit string for sanity display
    const re = /\] t:\s*([\d.]+)\s+TARGET[^\n]+M:\s*([-\d.]+)/g;
    const digits: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(stderr)) !== null && digits.length < 5) {
      const lufs = parseFloat(m[2]);
      const level = Math.min(1, Math.max(0, (lufs + 40) / 35));
      digits.push(String(Math.round(level * 9)));
    }

    if (mLines === 0) {
      console.error(
        `[ffmpeg-check] ERROR  ffmpeg ${versionLine}  0 M: lines — ` +
        `-v verbose may not be emitting per-frame ebur128 output in this build`,
      );
    } else {
      console.log(
        `[ffmpeg-check] OK     ffmpeg ${versionLine}  ebur128 M: lines=${mLines}` +
        `  sample digits="${digits.join(' ')}"`,
      );
    }
  } catch (err) {
    console.error('[ffmpeg-check] ERROR  ffmpeg not found or failed:', err instanceof Error ? err.message : err);
  } finally {
    fs.rmSync(tmpFile, { force: true });
  }
}

// ── Entry ─────────────────────────────────────────────────────────────────────

async function main() {
  await resetStuckJobs();
  await checkFfmpeg();
  const serveUrl = await buildBundle();
  await startPollingLoop(serveUrl);
}

main().catch((err) => {
  console.error('[blitz-worker] Fatal startup error:', err);
  process.exit(1);
});
