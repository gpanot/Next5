// server-only — never import from a 'use client' file.
// What the Claude connector's tools do: read the calendar ideas, write more, keep the ones picked (they go on the
// calendar as posts waiting for approval, paid as in the app), and point to the approval screen. It reuses the
// Content page's engine (src/server/labs/calendarIdeas.ts) and never publishes anything.

import { waitUntil } from '@vercel/functions';
import { prisma } from '../../lib/db';
import { HttpError } from '../http';
import { listSlideshowWorkspaces, requireSlideshowWorkspace } from '../autoSlideshow/workspaces';
import { affordableCredits } from '../slideshowCredits/charge';
import { createSlideshowIdeas, generateIdeas, listIdeas, makeSlideshowIdeas, patchIdea } from '../labs/calendarIdeas';
import { scheduleBlitz } from '../labs/blitzSchedule';
import type { DeckItem } from '../slideshow/core/deckAssembly';
import { IDEA_DAYS, IDEAS_PER_BATCH, type IdeaDto } from '../../types/admin/calendarIdeas';
import { BLITZ_LIVE } from '../../types/admin/blitzSchedule';
import { buildIdeaRenderBody, carouselTemplateId } from './ideaRender';
import { approvalPath, localTime, windowOf, type IdeaView } from './plannerFormat';
import type { McpCaller } from './oauthStore';

export { approvalPath };

type Ws = { id: string; name: string; tz: number };

/** The workspace a tool works in: the one named (if it is the caller's), else the one picked when connecting. */
export async function workspaceFor(caller: McpCaller, workspaceId?: string): Promise<Ws> {
  const ws = await requireSlideshowWorkspace(caller.userId, workspaceId || caller.defaultWorkspaceId);
  return { id: ws.id, name: ws.name, tz: ws.ideaTzOffsetMin ?? 0 };
}

/** The workspace's calendar run (the latest auto run): slideshows are made into it. */
async function calendarRunId(workspaceId: string): Promise<string> {
  const run = await prisma.autoSlideshowRun.findFirst({ where: { workspaceId, kind: 'auto' }, orderBy: { createdAt: 'desc' }, select: { id: true } });
  if (!run) throw new HttpError(409, 'not_set_up', 'This workspace is not set up yet. Open Next5 and finish adding your website first.');
  return run.id;
}

export async function listWorkspaces(caller: McpCaller) {
  const rows = await listSlideshowWorkspaces(caller.userId);
  return rows.map((w) => ({
    id: w.id, name: w.name, website: w.websiteUrl, tiktok: w.tiktokUsername, instagram: w.instagramUsername,
    connected_by_default: w.id === caller.defaultWorkspaceId,
  }));
}

const viewOf = (idea: IdeaDto, tz: number): IdeaView => {
  const card = idea.card as DeckItem | null;
  return {
    id: idea.id,
    format: idea.format === 'blitz' ? 'video' : 'slideshow',
    status: idea.status === 'kept' ? 'kept' : idea.status === 'discarded' ? 'skipped' : 'proposed',
    planned_for: localTime(new Date(idea.plannedAt), tz),
    planned_at: idea.plannedAt,
    hook: idea.hook,
    script: card ? card.shots.map((s) => s.text) : idea.outline,
    angle: card?.lensLabel ?? idea.goal ?? null,
    hook_style: card?.hookStyle ?? null,
    cover_url: idea.coverUrl,
    ready: idea.format === 'slideshow' ? idea.slideshow?.state === 'ready' : card?.finishing !== true,
    other_hooks: idea.hooks.map((h) => h.text),
  };
};

export type IdeasQuery = { workspaceId?: string; startDate?: string; days?: number; format?: 'any' | 'video' | 'slideshow'; writeMore?: boolean };

/**
 * The ideas planned in a window (default: the next 7 days from tomorrow). With `writeMore` (default on), a window with
 * fewer video ideas than days gets a new free batch first (about a minute), unless a batch's worth is already waiting
 * or one is being written.
 */
export async function getIdeas(caller: McpCaller, q: IdeasQuery) {
  const ws = await workspaceFor(caller, q.workspaceId);
  const days = Math.min(IDEA_DAYS, Math.max(1, Math.round(q.days ?? 7)));
  const win = windowOf(q.startDate, days, ws.tz);
  const inWindow = (list: IdeaDto[]) => list.filter((i) => i.status !== 'discarded' && i.status !== 'made' && new Date(i.plannedAt) >= win.from && new Date(i.plannedAt) < win.to);
  let list = await listIdeas(ws.id);
  let wrote = false;
  // Never more than a batch waiting: days already full of posts must not make every call write another batch.
  const waiting = list.ideas.filter((i) => i.format === 'blitz' && i.status === 'proposed' && new Date(i.plannedAt) > new Date()).length;
  const short = inWindow(list.ideas).filter((i) => i.format === 'blitz').length < days;
  if (q.writeMore !== false && short && waiting < IDEAS_PER_BATCH && list.batchSince === null) {
    const batch = await generateIdeas(ws.id, await calendarRunId(ws.id), ws.tz);
    waitUntil(batch.work().catch((err: unknown) => console.error('[mcp] ideas follow-up failed:', err)));
    list = batch.list;
    wrote = true;
  }
  const ideas = inWindow(list.ideas)
    .filter((i) => q.format === undefined || q.format === 'any' || (q.format === 'video' ? i.format === 'blitz' : i.format === 'slideshow'))
    .map((i) => viewOf(i, ws.tz));
  return {
    workspace: ws.name,
    window: { from: localTime(win.from, ws.tz), to: localTime(new Date(win.to.getTime() - 1), ws.tz) },
    wrote_new_batch: wrote,
    ideas,
    note: ideas.some((i) => i.format === 'slideshow' && !i.ready) ? 'Slideshows marked ready=false are still being made (1-2 minutes). Ask again shortly.' : undefined,
  };
}

/** 3 new photo slideshow ideas, made in the background (1-2 minutes). Free until kept; the balance must cover all 3. */
export async function requestSlideshows(caller: McpCaller, workspaceId?: string) {
  const ws = await workspaceFor(caller, workspaceId);
  const { list, work } = await createSlideshowIdeas(ws.id, caller.userId, await calendarRunId(ws.id), ws.tz);
  waitUntil(work().catch((err: unknown) => console.error('[mcp] slideshow ideas failed:', err)));
  const fresh = list.ideas.filter((i) => i.format === 'slideshow' && i.requested && i.status === 'proposed' && i.slideshow?.state !== 'ready');
  return { workspace: ws.name, started: fresh.map((i) => viewOf(i, ws.tz)), note: 'Being made now (1-2 minutes). Call get_post_ideas with format "slideshow" to see them once ready.' };
}

/** Skips ideas; a skipped video idea's day gets the next one from the reserve. */
export async function skipIdeas(caller: McpCaller, ids: string[], workspaceId?: string) {
  const ws = await workspaceFor(caller, workspaceId);
  const errors: Record<string, string> = {};
  for (const id of ids) await patchIdea(ws.id, id, { status: 'discarded' }).catch((err: unknown) => { errors[id] = messageOf(err); });
  return { skipped: ids.filter((id) => !errors[id]), errors };
}

const messageOf = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong.');

export type CalendarPick = { id: string; plannedAt?: string };

/**
 * Keeps the picked ideas and puts them on the calendar, waiting for approval: videos are scheduled as `planned` (1
 * credit now, refunded if not approved in time), slideshows (made already while proposed) move into the calendar run
 * and are charged. `plannedAt` moves an idea first. Returns what was added, what failed and why, and the approval link.
 */
export async function addToCalendar(caller: McpCaller, picks: CalendarPick[], workspaceId?: string) {
  const ws = await workspaceFor(caller, workspaceId);
  const errors: Record<string, string> = {};
  const fail = (id: string) => (err: unknown) => { errors[id] = messageOf(err); };

  for (const p of picks) {
    if (errors[p.id]) continue;
    await patchIdea(ws.id, p.id, { ...(p.plannedAt ? { plannedAt: p.plannedAt } : {}), status: 'kept' }).catch(fail(p.id));
  }
  const kept = (await listIdeas(ws.id)).ideas.filter((i) => picks.some((p) => p.id === i.id) && !errors[i.id] && i.status === 'kept');
  const added: Array<{ id: string; format: string; planned_for: string; hook: string }> = [];
  const done = (i: IdeaDto) => added.push({ id: i.id, format: i.format === 'blitz' ? 'video' : 'slideshow', planned_for: localTime(new Date(i.plannedAt), ws.tz), hook: i.hook });

  const videos = kept.filter((i) => i.format === 'blitz');
  if (videos.length > 0) {
    const templateId = await carouselTemplateId();
    // One by one: each checks its day still has room.
    for (const idea of videos) {
      const built = templateId && idea.card ? buildIdeaRenderBody(idea.card as DeckItem, idea.id, templateId) : { error: 'No video template is set up.' };
      if ('error' in built) {
        errors[idea.id] = built.error;
        continue;
      }
      const at = new Date(idea.plannedAt);
      await scheduleBlitz(ws.id, caller.userId, { cardId: idea.id, variantId: idea.id, title: idea.hook, scheduledAt: at.toISOString(), tzOffsetMin: ws.tz, renderBody: built.body })
        .then(() => done(idea), fail(idea.id));
    }
  }

  const shows = kept.filter((i) => i.format === 'slideshow');
  if (shows.length > 0) {
    const made = await makeSlideshowIdeas(ws.id, caller.userId, await calendarRunId(ws.id), shows.map((i) => i.id)).catch((err: unknown) => {
      shows.forEach((i) => fail(i.id)(err));
      return null;
    });
    if (made) {
      Object.assign(errors, made.errors);
      for (const m of made.made) done(shows.find((i) => i.id === m.ideaId)!);
    }
  }

  const missing = picks.filter((p) => !added.some((a) => a.id === p.id) && !errors[p.id]);
  for (const p of missing) errors[p.id] = 'Idea not found, already made, or skipped.';
  return {
    workspace: ws.name,
    added,
    failed: Object.entries(errors).map(([id, reason]) => ({ id, reason })),
    credits_left: await affordableCredits(caller.userId).catch(() => null),
    approval: await approvalInfo(caller, ws.id),
    note: 'Nothing is published yet. Every post waits for the user to approve it in Next5 (open the approval link).',
  };
}

/** Posts waiting for approval and the link that opens the approval screen. */
export async function approvalInfo(caller: McpCaller, workspaceId?: string) {
  const ws = await workspaceFor(caller, workspaceId);
  const now = new Date();
  const [videos, shows] = await Promise.all([
    prisma.blitzScheduledPost.count({ where: { workspaceId: ws.id, status: 'planned', scheduledAt: { gt: now } } }),
    // Slideshows made from calendar ideas and not approved yet (no post row), with their planned day.
    prisma.slideshowVariant.findMany({ where: { workspaceId: ws.id, engine: 'bank', status: 'made', plannedAt: { gt: now } }, select: { plan: true, plannedAt: true } }),
  ]);
  const pins = shows
    .map((s) => ({ slideshowId: (s.plan as { slideshowId?: string } | null)?.slideshowId, at: s.plannedAt! }))
    .filter((p): p is { slideshowId: string; at: Date } => typeof p.slideshowId === 'string');
  const posted = pins.length > 0
    ? new Set((await prisma.autoSlideshowPost.findMany({ where: { slideshowId: { in: pins.map((p) => p.slideshowId) }, status: { not: 'canceled' } }, select: { slideshowId: true } })).map((p) => p.slideshowId))
    : new Set<string>();
  const waiting = pins.filter((p) => !posted.has(p.slideshowId));
  return {
    waiting_for_approval: videos + waiting.length,
    approval_url: `${appOrigin()}${approvalPath(ws.id, waiting)}`,
  };
}

/** Where the user opens Next5 (the email links' base). */
const appOrigin = () => (process.env.NEXT_PUBLIC_APP_URL ?? 'https://next5.giinger.com').replace(/\/$/, '');

/** Live Blitz posts in the window (for "what is already on my calendar"). */
export async function calendarPosts(caller: McpCaller, q: { workspaceId?: string; startDate?: string; days?: number }) {
  const ws = await workspaceFor(caller, q.workspaceId);
  const win = windowOf(q.startDate, Math.min(31, Math.max(1, Math.round(q.days ?? 7))), ws.tz);
  const range = { gte: win.from, lt: win.to };
  const [videos, shows] = await Promise.all([
    prisma.blitzScheduledPost.findMany({ where: { workspaceId: ws.id, status: { in: BLITZ_LIVE }, scheduledAt: range }, orderBy: { scheduledAt: 'asc' }, select: { title: true, status: true, scheduledAt: true, platform: true, postUrl: true } }),
    prisma.autoSlideshowPost.findMany({ where: { workspaceId: ws.id, status: { not: 'canceled' }, scheduledAt: range }, orderBy: { scheduledAt: 'asc' }, select: { status: true, scheduledAt: true, platform: true, postUrl: true, slideshow: { select: { topic: true } } } }),
  ]);
  return {
    workspace: ws.name,
    posts: [
      ...videos.map((v) => ({ format: 'video', title: v.title, status: v.status === 'planned' ? 'waiting_for_approval' : v.status, when: localTime(v.scheduledAt, ws.tz), platform: v.platform, url: v.postUrl })),
      ...shows.map((s) => ({ format: 'slideshow', title: s.slideshow.topic, status: s.status, when: localTime(s.scheduledAt, ws.tz), platform: s.platform, url: s.postUrl })),
    ].sort((a, b) => a.when.localeCompare(b.when)),
  };
}
