// server-only — never import from a 'use client' file.
// The admin's progress panel for one Prospect Pack: every task of each part (advance.ts), with its state and why it
// waits or failed. Read only: it reports what the rows say, it never moves the pack on.

import type { AutoSlideshow, AutoSlideshowRun, ProspectPack } from '@prisma/client';
import { prisma } from '../../lib/db';
import { AUTO_STEP_LABELS, AUTO_STEPS, type AutoSlide, type AutoStep } from '../../types/admin/autoSlideshow';
import { PROSPECT_BLITZ_TRIES, PROSPECT_MAX_ACTIVE, type ProspectTask, type ProspectTaskGroup, type ProspectTasksDto } from '../../types/admin/prospects';
import { blitzOf, loadPack } from './store';

type Run = Pick<AutoSlideshowRun, 'status' | 'failedStep' | 'error' | 'stepTimings' | 'finishedAt' | 'coverOnlyPositions'>;
type Show = Pick<AutoSlideshow, 'position' | 'topic' | 'status' | 'error' | 'slides'>;

const task = (label: string, state: ProspectTask['state'], detail: string | null = null): ProspectTask => ({ label, state, detail });
const minutesAgo = (at: Date): string => `${Math.max(0, Math.round((Date.now() - at.getTime()) / 60_000))} min ago`;
const seconds = (ms: number | undefined): string | null => (ms ? `${Math.round(ms / 1000)} s` : null);

/** One step of the brand run (Scan … Render). */
const stepTask = (run: Run | null, step: AutoStep): ProspectTask => {
  const label = `${step}. ${AUTO_STEP_LABELS[step]}`;
  const took = seconds((run?.stepTimings as Record<string, number> | null)?.[step]);
  if (!run) return task(label, 'waiting');
  if (run.status === 'COMPLETED') return task(label, 'done', took);
  if (run.status === 'FAILED') {
    const failed = run.failedStep ?? 1;
    return step < failed ? task(label, 'done', took) : step === failed ? task(label, 'failed', run.error) : task(label, 'skipped');
  }
  const current = run.status === 'HELD' ? 4 : Number(run.status.match(/^STEP_(\d)_RUNNING$/)?.[1] ?? 1);
  if (step < current) return task(label, 'done', took);
  if (step === current) return run.status === 'HELD' ? task(label, 'waiting', 'Waits for the face check') : task(label, 'running');
  return task(label, 'waiting');
};

/** A slideshow of a run: written → photos → rendering → ready (or a cover-only preview). */
const showTask = (show: Show, cover: boolean, runFailed: boolean): ProspectTask => {
  const label = `#${show.position + 1} ${show.topic}`;
  if (show.status === 'ready') return task(label, 'done');
  if (show.status === 'failed') return task(label, 'failed', show.error);
  if (cover && (show.slides as unknown as AutoSlide[] | null)?.[0]?.imageKey) return task(label, 'done', 'Preview: first slide only');
  if (runFailed) return task(label, 'failed', show.error ?? 'The run stopped');
  return task(label, 'running', show.status === 'rendering' ? 'Rendering' : 'Writing and photos');
};

const siteGroup = async (pack: ProspectPack, run: Run | null): Promise<ProspectTaskGroup> => {
  if (pack.status === 'queued') {
    const ahead = await prisma.prospectPack.count({ where: { status: 'queued', createdAt: { lt: pack.createdAt } } });
    return { title: 'Site + faces', tasks: [task('Start', 'waiting', `Waiting for a free slot (${PROSPECT_MAX_ACTIVE} made at once): ${ahead + 1} in line`)] };
  }
  const faces = await prisma.brandCastMember.count({ where: { workspaceId: pack.workspaceId, archivedAt: null, imageKey: { not: null } } });
  const facesTask =
    pack.approvedAt ? task('Face check', 'done', `${faces} faces approved`)
    : pack.status === 'faces' ? task('Face check', 'running', `${faces} faces ready: approve them on the row`)
    : run?.status === 'FAILED' ? task('Face check', 'skipped')
    : task('Face check', 'waiting', faces ? `${faces} faces made so far` : null);
  return { title: 'Site + faces', tasks: [...AUTO_STEPS.slice(0, 3).map((s) => stepTask(run, s)), facesTask] };
};

const castGroup = (run: Run | null, shows: Show[]): ProspectTaskGroup => {
  const failed = run?.status === 'FAILED';
  const steps = AUTO_STEPS.slice(3).map((s) => stepTask(run, s));
  return { title: 'Brand Cast slideshows', tasks: [...steps, ...shows.map((s) => showTask(s, !!run?.coverOnlyPositions.includes(s.position), failed))] };
};

const hooksGroup = (pack: ProspectPack, shows: Show[]): ProspectTaskGroup => {
  const error = pack.error?.startsWith('Hooks Volume') ? pack.error : null;
  const build =
    shows.length > 0 ? task('Build the campaign', 'done')
    : error ? task('Build the campaign', 'failed', error)
    : pack.hooksStartedAt ? task('Build the campaign', 'running', `Started ${minutesAgo(pack.hooksStartedAt)} (redone after 10 min)`)
    : task('Build the campaign', 'waiting', pack.approvedAt ? 'Starts on the next step' : 'Starts after the face check');
  return { title: 'Hooks Volume slideshows', tasks: [build, ...shows.map((s) => showTask(s, false, false))] };
};

/** The Blitz videos: waiting for ideas, then each idea (preview, retry, render line, render). */
const videoGroup = async (pack: ProspectPack, run: Run | null): Promise<ProspectTaskGroup> => {
  const picked = blitzOf(pack);
  if (picked.length === 0) {
    const since = run?.finishedAt ? `Brand Cast done ${minutesAgo(run.finishedAt)}: goes on without videos after 15 min` : 'Ideas are written after the site scan';
    const state = pack.status === 'making' ? 'running' : pack.status === 'ready' || pack.status === 'claimed' ? 'skipped' : 'waiting';
    return { title: 'Videos', tasks: [task('Pick 7 Blitz ideas', state, state === 'skipped' ? 'No ideas came in time' : since)] };
  }
  const ids = picked.flatMap((b) => (b.projectId ? [b.projectId] : []));
  const projects = await prisma.blitzProject.findMany({ where: { id: { in: ids } }, select: { id: true, renderStatus: true, createdAt: true, renderStartedAt: true, renderFinishedAt: true } });
  const byId = new Map(projects.map((p) => [p.id, p]));
  const tasks = await Promise.all(picked.map(async (b, i): Promise<ProspectTask> => {
    const label = `Video ${i + 1}`;
    const tries = b.tries ?? 1;
    if (b.error) return b.retry && tries < PROSPECT_BLITZ_TRIES ? task(label, 'running', `Try ${tries + 1}/${PROSPECT_BLITZ_TRIES} after: ${b.error}`) : task(label, 'failed', b.error);
    if (b.preview) return task(label, 'done', 'Preview: photos only, rendered once they pay');
    const project = b.projectId ? byId.get(b.projectId) : undefined;
    if (!project) return task(label, 'running', 'Getting photos');
    if (project.renderStatus === 'COMPLETED') return task(label, 'done', project.renderStartedAt && project.renderFinishedAt ? `Rendered in ${seconds(project.renderFinishedAt.getTime() - project.renderStartedAt.getTime())}` : null);
    if (project.renderStatus === 'FAILED') return task(label, 'failed', 'Render failed (see the blitz-worker logs)');
    if (project.renderStatus === 'PROCESSING') return task(label, 'running', `Rendering, started ${minutesAgo(project.renderStartedAt ?? project.createdAt)}`);
    const ahead = await prisma.blitzProject.count({ where: { renderStatus: 'PENDING', createdAt: { lt: project.createdAt } } });
    return task(label, 'waiting', `In the render line: ${ahead + 1}`);
  }));
  return { title: 'Videos', tasks };
};

const finishGroup = (pack: ProspectPack): ProspectTaskGroup => {
  const state = pack.status === 'ready' || pack.status === 'claimed' ? 'done' : pack.status === 'failed' ? 'failed' : 'waiting';
  return { title: 'Share link', tasks: [task('Plan the 14 days and open the link', state, state === 'failed' ? pack.error : state === 'waiting' ? 'When every part above is done' : null)] };
};

export const packTasks = async (id: string): Promise<ProspectTasksDto> => {
  const pack = await loadPack(id);
  const runSelect = { status: true, failedStep: true, error: true, stepTimings: true, finishedAt: true, coverOnlyPositions: true } as const;
  const showSelect = { position: true, topic: true, status: true, error: true, slides: true } as const;
  const [run, castShows, hookShows] = await Promise.all([
    pack.brandRunId ? prisma.autoSlideshowRun.findUnique({ where: { id: pack.brandRunId }, select: runSelect }) : null,
    pack.brandRunId ? prisma.autoSlideshow.findMany({ where: { runId: pack.brandRunId }, orderBy: { position: 'asc' }, select: showSelect }) : [],
    pack.hooksRunId ? prisma.autoSlideshow.findMany({ where: { runId: pack.hooksRunId }, orderBy: { position: 'asc' }, select: showSelect }) : [],
  ]);
  const groups = [await siteGroup(pack, run), castGroup(run, castShows), hooksGroup(pack, hookShows), await videoGroup(pack, run)];
  return { groups: [...groups, finishGroup(pack)] };
};
