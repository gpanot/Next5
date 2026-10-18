// server-only — never import from a 'use client' file.
// A Prospect Pack's Blitz videos: PROSPECT_BLITZ of the workspace's first Blitz ideas (written by labs/firstIdeas.ts
// after the run's step 1), rendered to mp4 for the review page. Stock photos only: the placeholder owner never pays and
// has stock_images_only. Built like the connector does it (mcp/ideaRender.ts, mcp/ideaPhotos.ts), with no browser.
// The ideas stay "kept" (not scheduled): the person who claims the pack puts them on the calendar.

import { prisma } from '../../lib/db';
import type { IdeaDto } from '../../types/admin/calendarIdeas';
import { PROSPECT_BLITZ, type ProspectBlitz } from '../../types/admin/prospects';
import { listIdeas } from '../labs/calendarIdeas';
import { queueBlitzRender } from '../labs/blitzRender';
import type { LabAccess } from '../labs/labAccess';
import { brandOf, fillMissingPhotos, missingPhotos } from '../mcp/ideaPhotos';
import { buildIdeaRenderBody, carouselTemplateId } from '../mcp/ideaRender';
import type { DeckItem } from '../slideshow/core/deckAssembly';

/** Finished Blitz ideas waiting on a day, first day first. */
const readyIdeas = (ideas: IdeaDto[]): IdeaDto[] =>
  ideas
    .filter((i) => i.format === 'blitz' && i.status === 'proposed' && i.card && !i.card.finishing)
    .sort((a, b) => a.plannedAt.localeCompare(b.plannedAt));

/** True when the batch has enough finished ideas, or is done writing (then the pack takes what there is). */
export const blitzReady = async (workspaceId: string): Promise<IdeaDto[] | null> => {
  const list = await listIdeas(workspaceId);
  const ready = readyIdeas(list.ideas);
  if (ready.length >= PROSPECT_BLITZ) return ready.slice(0, PROSPECT_BLITZ);
  const writing = list.batchSince !== null || list.ideas.some((i) => i.format === 'blitz' && i.card?.finishing);
  return writing || ready.length === 0 ? null : ready;
};

/** One idea rendered (free: an impersonated access); the reason when it cannot be. */
const renderIdea = async (access: LabAccess, idea: IdeaDto, templateId: string, brand: Awaited<ReturnType<typeof brandOf>>): Promise<ProspectBlitz> => {
  const workspaceId = access.workspaceId!;
  let card = idea.card as DeckItem;
  if (missingPhotos(card).length > 0) card = await fillMissingPhotos(idea.id, card, workspaceId, brand);
  if (missingPhotos(card).length > 0) return { ideaId: idea.id, projectId: null, error: 'No stock photo for every shot yet.', retry: true };
  const built = buildIdeaRenderBody(card, idea.id, templateId);
  if ('error' in built) return { ideaId: idea.id, projectId: null, error: built.error };
  const project = await queueBlitzRender(access, built.body);
  await prisma.slideshowVariant.update({ where: { id: idea.id }, data: { status: 'kept' } });
  return { ideaId: idea.id, projectId: project.id };
};

/** The workspace's ideas with these ids (still proposed: a picked idea is kept only once its render is queued). */
export const ideasById = async (workspaceId: string, ids: string[]): Promise<IdeaDto[]> =>
  (await listIdeas(workspaceId)).ideas.filter((i) => ids.includes(i.id) && i.card);

/** Renders the picked ideas one by one (the photo scraper refuses bursts). */
export const renderBlitz = async (userId: string, workspaceId: string, name: string, ideas: IdeaDto[]): Promise<ProspectBlitz[]> => {
  const templateId = await carouselTemplateId();
  if (!templateId) return ideas.map((i) => ({ ideaId: i.id, projectId: null, error: 'No video template is set up.' }));
  const access: LabAccess = { admin: false, userId, workspaceId, impersonated: true };
  const brand = await brandOf(workspaceId, name);
  const out: ProspectBlitz[] = [];
  for (const idea of ideas) {
    out.push(await renderIdea(access, idea, templateId, brand).catch((err: unknown) => ({ ideaId: idea.id, projectId: null, error: err instanceof Error ? err.message : String(err) })));
  }
  return out;
};

/** How many picked videos are rendered, and whether every render has ended (done or failed). */
export const blitzRenders = async (picked: ProspectBlitz[]): Promise<{ done: number; settled: boolean }> => {
  const ids = picked.flatMap((p) => (p.projectId ? [p.projectId] : []));
  const rows = ids.length ? await prisma.blitzProject.findMany({ where: { id: { in: ids } }, select: { renderStatus: true } }) : [];
  return { done: rows.filter((r) => r.renderStatus === 'COMPLETED').length, settled: rows.every((r) => r.renderStatus === 'COMPLETED' || r.renderStatus === 'FAILED') };
};
