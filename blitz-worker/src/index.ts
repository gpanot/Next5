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
import { bundle } from '@remotion/bundler';
import { prisma } from './db';
import { renderProject } from './render';

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
  const serveUrl = await bundle({ entryPoint });
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

// ── Entry ─────────────────────────────────────────────────────────────────────

async function main() {
  await resetStuckJobs();
  const serveUrl = await buildBundle();
  await startPollingLoop(serveUrl);
}

main().catch((err) => {
  console.error('[blitz-worker] Fatal startup error:', err);
  process.exit(1);
});
