// server-only — never import from a 'use client' file.
// The admin workspace page: one workspace's owner, runs, full brand extraction and content matrices.

import { prisma } from '../../lib/db';
import type {
  BlitzCardCell,
  BlitzCardMatrixDto,
  WorkspaceBankMatrix,
  WorkspaceBrandDto,
  WorkspaceDetailDto,
} from '../../types/admin/workspaceDetail';
import { bankMatrix } from '../autoSlideshow/bank/matrix';
import { HttpError } from '../http';

/** Workspace runs the user started (idea runs are hidden helpers of a workspace run). */
const workspaceRuns = (workspaceId: string) => ({ workspaceId, ideaForRunId: null });

export const workspaceDetail = async (workspaceId: string): Promise<WorkspaceDetailDto> => {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { owner: { select: { id: true, email: true, createdAt: true } }, socialConnections: { select: { provider: true, username: true } } },
  });
  if (!ws) throw new HttpError(404, 'workspace_not_found', 'Workspace not found.');
  const [runs, slideshows, posts, blitzVideos, blitzCards] = await Promise.all([
    prisma.autoSlideshowRun.findMany({
      where: workspaceRuns(workspaceId),
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, url: true, status: true, count: true, createdAt: true, _count: { select: { slideshows: true } } },
    }),
    prisma.autoSlideshow.count({ where: { run: { workspaceId } } }),
    prisma.autoSlideshowPost.count({ where: { workspaceId } }),
    prisma.blitzProject.count({ where: { workspaceId } }),
    prisma.slideshowVariant.count({ where: { workspaceId } }),
  ]);
  return {
    workspace: {
      id: ws.id, name: ws.name, product: ws.product, websiteUrl: ws.websiteUrl, industry: ws.industry,
      brandColors: ws.brandColors, deleted: Boolean(ws.deletedAt), createdAt: ws.createdAt.toISOString(),
    },
    owner: { id: ws.owner.id, email: ws.owner.email, createdAt: ws.owner.createdAt.toISOString() },
    social: ws.socialConnections,
    runs: runs.map((r) => ({ id: r.id, url: r.url, status: r.status, count: r.count, slideshows: r._count.slideshows, createdAt: r.createdAt.toISOString() })),
    counts: { slideshows, posts, blitzVideos, blitzCards },
  };
};

/** Every brand extraction the workspace has: its signup extract, the latest company profile per site, the latest run's profile. */
export const workspaceBrand = async (workspaceId: string): Promise<WorkspaceBrandDto> => {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { brandExtract: true, brandExtractAt: true } });
  if (!ws) throw new HttpError(404, 'workspace_not_found', 'Workspace not found.');
  const recentRuns = await prisma.autoSlideshowRun.findMany({
    where: workspaceRuns(workspaceId),
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, profile: true },
  });
  const latestRun = recentRuns.find((r) => r.profile !== null);
  const runProfileIds = await prisma.autoSlideshowRun.findMany({
    where: { workspaceId, brandProfileId: { not: null } },
    distinct: ['brandProfileId'],
    select: { brandProfileId: true },
  });
  const linked = runProfileIds.flatMap((r) => (r.brandProfileId ? [r.brandProfileId] : []));
  const rows = await prisma.studioBrandProfile.findMany({
    where: { OR: [{ workspaceId }, { id: { in: linked } }] },
    orderBy: [{ createdAt: 'desc' }],
    take: 30,
  });
  // Newest first, so the first row seen per site is its latest version.
  const latest = rows.filter((row, i) => rows.findIndex((r) => r.sourceUrl === row.sourceUrl) === i);
  return {
    brandExtract: ws.brandExtract,
    brandExtractAt: ws.brandExtractAt?.toISOString() ?? null,
    profiles: latest.map((p) => ({ id: p.id, sourceUrl: p.sourceUrl, version: p.version, createdAt: p.createdAt.toISOString(), data: p.data, crawl: p.crawl })),
    runProfile: latestRun?.profile ? { runId: latestRun.id, profile: latestRun.profile } : null,
  };
};

/** One Slideshow Bank per website the workspace made slideshows for, read through its latest run on that site. */
export const workspaceBankMatrices = async (workspaceId: string): Promise<WorkspaceBankMatrix[]> => {
  const runs = await prisma.autoSlideshowRun.findMany({
    where: workspaceRuns(workspaceId),
    orderBy: { createdAt: 'desc' },
    distinct: ['url'],
    select: { id: true, url: true },
  });
  return Promise.all(runs.map(async (r) => ({ url: r.url, runId: r.id, matrix: await bankMatrix(r.id, workspaceId) })));
};

/** The workspace's Blitz deck cards as a lens × archetype grid, counted by status. */
export const blitzCardMatrix = async (workspaceId: string): Promise<BlitzCardMatrixDto> => {
  const groups = await prisma.slideshowVariant.groupBy({
    by: ['lens', 'archetype', 'status'],
    where: { workspaceId },
    _count: { _all: true },
  });
  const cells = new Map<string, BlitzCardCell>();
  for (const g of groups) {
    const key = `${g.lens}\n${g.archetype}`;
    const cell = cells.get(key) ?? { lens: g.lens, archetype: g.archetype, total: 0, byStatus: {} };
    cell.total += g._count._all;
    cell.byStatus[g.status] = (cell.byStatus[g.status] ?? 0) + g._count._all;
    cells.set(key, cell);
  }
  const list = [...cells.values()];
  const sorted = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));
  return {
    lenses: sorted(list.map((c) => c.lens)),
    archetypes: sorted(list.map((c) => c.archetype)),
    cells: list,
    total: list.reduce((n, c) => n + c.total, 0),
  };
};
