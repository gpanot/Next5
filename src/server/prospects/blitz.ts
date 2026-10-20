// server-only — never import from a 'use client' file.
// A Prospect Pack's Blitz videos: PROSPECT_BLITZ of the workspace's first Blitz ideas (written by labs/firstIdeas.ts
// after the run's step 1), rendered to mp4 for the review page. Stock photos only: the placeholder owner never pays and
// has stock_images_only. Built like the connector does it (mcp/ideaRender.ts, mcp/ideaPhotos.ts), with no browser.
// The ideas stay "kept" (not scheduled): the person who claims the pack puts them on the calendar.
// Ideas past the free days are previews: their photos are filled (the review page shows the first shot) but they are
// rendered only once the pack is unlocked (unlock.ts).

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

/** Finished ideas the pack has not picked yet (first day first, at most what it still takes), and whether the batch is
 *  still writing more. The pack picks them as they finish, so each video renders without waiting for the others. */
export const unpickedIdeas = async (workspaceId: string, picked: Set<string>): Promise<{ ideas: IdeaDto[]; writing: boolean }> => {
  const list = await listIdeas(workspaceId);
  const ideas = readyIdeas(list.ideas).filter((i) => !picked.has(i.id)).slice(0, Math.max(0, PROSPECT_BLITZ - picked.size));
  const writing = list.batchSince !== null || list.ideas.some((i) => i.format === 'blitz' && i.card?.finishing);
  return { ideas, writing };
};

/** What rendering an idea reads from it. */
type Renderable = Pick<IdeaDto, 'id' | 'card'>;

/** One idea rendered (free: an impersonated access), or only its photos filled for a `preview`; the reason when it cannot be. */
const renderIdea = async (access: LabAccess, idea: Renderable, templateId: string, brand: Awaited<ReturnType<typeof brandOf>>, preview: boolean): Promise<ProspectBlitz> => {
  const workspaceId = access.workspaceId!;
  let card = idea.card as DeckItem;
  if (missingPhotos(card).length > 0) card = await fillMissingPhotos(idea.id, card, workspaceId, brand);
  if (missingPhotos(card).length > 0) return { ideaId: idea.id, projectId: null, error: 'No stock photo for every shot yet.', retry: true };
  const built = buildIdeaRenderBody(card, idea.id, templateId);
  if ('error' in built) return { ideaId: idea.id, projectId: null, error: built.error };
  if (preview) {
    await prisma.slideshowVariant.update({ where: { id: idea.id }, data: { status: 'kept' } });
    return { ideaId: idea.id, projectId: null };
  }
  const project = await queueBlitzRender(access, built.body);
  await prisma.slideshowVariant.update({ where: { id: idea.id }, data: { status: 'kept' } });
  return { ideaId: idea.id, projectId: project.id };
};

/** True when the pack takes no more ideas: it has PROSPECT_BLITZ, or the batch is done writing and none is left. */
export const blitzPicked = async (workspaceId: string, picked: ProspectBlitz[]): Promise<boolean> => {
  if (picked.length >= PROSPECT_BLITZ) return true;
  if (picked.length === 0) return false;
  const { ideas, writing } = await unpickedIdeas(workspaceId, new Set(picked.map((b) => b.ideaId)));
  return !writing && ideas.length === 0;
};

/** The workspace's ideas with these ids (still proposed: a picked idea is kept only once its render is queued). */
export const ideasById = async (workspaceId: string, ids: string[]): Promise<IdeaDto[]> =>
  (await listIdeas(workspaceId)).ideas.filter((i) => ids.includes(i.id) && i.card);

/** Kept ideas with these ids (previews, rendered once the pack is unlocked). */
export const keptIdeas = async (workspaceId: string, ids: string[]): Promise<Renderable[]> => {
  const rows = await prisma.slideshowVariant.findMany({ where: { id: { in: ids }, workspaceId }, select: { id: true, plan: true } });
  const cards = new Map(rows.map((r) => [r.id, (r.plan as { card?: DeckItem } | null)?.card ?? null]));
  return ids.flatMap((id) => {
    const card = cards.get(id);
    return card ? [{ id, card }] : [];
  });
};

/** Renders the picked ideas one by one (the photo scraper refuses bursts); the ones in `previews` only get their photos. */
export const renderBlitz = async (userId: string, workspaceId: string, name: string, ideas: Renderable[], previews: Set<string> = new Set()): Promise<ProspectBlitz[]> => {
  const templateId = await carouselTemplateId();
  const tag = (r: ProspectBlitz): ProspectBlitz => (previews.has(r.ideaId) ? { ...r, preview: true } : r);
  if (!templateId) return ideas.map((i) => tag({ ideaId: i.id, projectId: null, error: 'No video template is set up.' }));
  const access: LabAccess = { admin: false, userId, workspaceId, impersonated: true };
  const brand = await brandOf(workspaceId, name);
  const out: ProspectBlitz[] = [];
  for (const idea of ideas) {
    const result = await renderIdea(access, idea, templateId, brand, previews.has(idea.id)).catch((err: unknown) => ({ ideaId: idea.id, projectId: null, error: err instanceof Error ? err.message : String(err) }));
    out.push(tag(result));
  }
  return out;
};

/** How many picked videos are rendered, how many wait in line, and whether every render has ended (done or failed). */
export const blitzRenders = async (picked: ProspectBlitz[]): Promise<{ done: number; waiting: number; settled: boolean }> => {
  const ids = picked.flatMap((p) => (p.projectId ? [p.projectId] : []));
  const rows = ids.length ? await prisma.blitzProject.findMany({ where: { id: { in: ids } }, select: { renderStatus: true } }) : [];
  return { done: rows.filter((r) => r.renderStatus === 'COMPLETED').length, waiting: rows.filter((r) => r.renderStatus === 'PENDING').length, settled: rows.every((r) => r.renderStatus === 'COMPLETED' || r.renderStatus === 'FAILED') };
};
