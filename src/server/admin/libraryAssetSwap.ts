// server-only — never import from a 'use client' file.
// Stopgap for the admin Assets Library delete: when a pending post, render or Auto Slideshow still
// uses an asset, a random asset of the same section takes its place there, so the delete can go on.

import type { BlitzAsset, Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { blitzMediaKind } from './blitzStore';

/** Scheduled posts still to be rendered read their files from R2 at render time. */
const PENDING_POST_STATUSES = ['planned', 'scheduled', 'rendering'];

/** Auto Slideshows not rendered yet still need their sound. */
const PENDING_SLIDESHOW_STATUSES = ['written', 'rendering'];

type PendingPost = { id: string; body: string; coverKey: string | null };
type PendingRender = { id: string; assets: string };

/** Everything that still reads library files later, loaded once per delete request. */
export type PendingUses = { posts: PendingPost[]; renders: PendingRender[] };

export async function loadPendingUses(): Promise<PendingUses> {
  const posts = await prisma.$queryRaw<PendingPost[]>`
    SELECT id, render_body::text AS body, cover_key AS "coverKey" FROM blitz_scheduled_posts
    WHERE status = ANY(${PENDING_POST_STATUSES}::text[]) AND render_body IS NOT NULL`;
  const projects = await prisma.blitzProject.findMany({
    where: { renderStatus: { in: ['PENDING', 'PROCESSING'] } },
    select: { id: true, currentAssets: true },
  });
  return { posts, renders: projects.map((p) => ({ id: p.id, assets: JSON.stringify(p.currentAssets) })) };
}

/** A random asset of the same type and media kind, visible where the old one was, not being deleted. */
export async function pickReplacement(asset: BlitzAsset, excludeIds: string[]): Promise<BlitzAsset | null> {
  const candidates = await prisma.blitzAsset.findMany({
    where: {
      type: asset.type,
      id: { notIn: excludeIds },
      OR: [{ workspaceId: null }, ...(asset.workspaceId ? [{ workspaceId: asset.workspaceId }] : [])],
    },
  });
  const kind = blitzMediaKind(asset.r2Key);
  const sameKind = candidates.filter((c) => blitzMediaKind(c.r2Key) === kind);
  if (sameKind.length === 0) return null;
  return sameKind[Math.floor(Math.random() * sameKind.length)];
}

/** True when a pending post, render or Auto Slideshow still uses the asset. */
export async function isInUse(asset: BlitzAsset, uses: PendingUses): Promise<boolean> {
  const quoted = JSON.stringify(asset.r2Key);
  if (uses.posts.some((p) => p.body.includes(quoted) || p.coverKey === asset.r2Key)) return true;
  if (uses.renders.some((r) => r.assets.includes(quoted))) return true;
  const slideshows = await prisma.autoSlideshow.count({
    where: { audioAssetId: asset.id, status: { in: PENDING_SLIDESHOW_STATUSES } },
  });
  return slideshows > 0;
}

/** Puts `next` everywhere pending work uses `old`. Keeps `uses` in step so later swaps see the change. */
export async function swapAsset(old: BlitzAsset, next: BlitzAsset, uses: PendingUses): Promise<void> {
  const from = JSON.stringify(old.r2Key);
  const to = JSON.stringify(next.r2Key);
  for (const post of uses.posts) {
    if (!post.body.includes(from) && post.coverKey !== old.r2Key) continue;
    post.body = post.body.split(from).join(to);
    if (post.coverKey === old.r2Key) post.coverKey = next.r2Key;
    await prisma.blitzScheduledPost.update({
      where: { id: post.id },
      data: { renderBody: JSON.parse(post.body) as Prisma.InputJsonValue, coverKey: post.coverKey },
    });
  }
  for (const render of uses.renders) {
    if (!render.assets.includes(from)) continue;
    render.assets = render.assets.split(from).join(to);
    await prisma.blitzProject.update({
      where: { id: render.id },
      data: { currentAssets: JSON.parse(render.assets) as Prisma.InputJsonValue },
    });
  }
  await prisma.autoSlideshow.updateMany({
    where: { audioAssetId: old.id, status: { in: PENDING_SLIDESHOW_STATUSES } },
    data: { audioAssetId: next.id },
  });
}
