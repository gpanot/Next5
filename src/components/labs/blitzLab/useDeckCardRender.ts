'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import type { TextConfig } from '../../../remotion/types';
import { useLabClient } from '../LabClientProvider';
import type { BlitzAssetDto, BlitzProjectDto, BlitzTemplateDto, LabClient } from './api';
import { logDeckAction, type CopyCheckContext } from './deckApi';
import { deckRenderBody, type RenderBody } from './deckRenderBody';
import type { KeptRenderView } from './KeptList';
import type { SlideData } from './SlidePreview';
import type { DeckCardData } from './SwipeDeck';
import { toSlide } from './useDeckCardEditor';
import { fetchListingPhotos, fillListingBackgrounds } from './useListingPhotoImport';
import type { ZillowData } from './ZillowScrapeStep';

type Submit = (body: RenderBody, onError?: (message: string) => void) => Promise<string | null>;

type Options = {
  template: BlitzTemplateDto | null;
  zillowData: ZillowData | null;
  checkContext: CopyCheckContext | null;
  assets: BlitzAssetDto[];
  addAsset: (asset: BlitzAssetDto) => void;
  library: BlitzProjectDto[];
  textOverride: Partial<TextConfig>;
  setDeckCards: Dispatch<SetStateAction<DeckCardData[]>>;
  submit: Submit;
  /** Render queue positions (PENDING jobs) and jobs the poller gave up on, by project id. */
  queue: Record<string, number>;
  stalled: Record<string, true>;
};

/** The card's shots as render slides; listing-photo shots get their imported photo. */
async function slidesFor(card: DeckCardData, o: Options, client: LabClient): Promise<SlideData[]> {
  const slides = card.shots.map(toSlide);
  if (!o.zillowData || slides.every((s) => s.backgroundKey)) return slides;
  const imported = await fetchListingPhotos(client, o.zillowData);
  imported.forEach(o.addAsset);
  return fillListingBackgrounds(slides, card.shots.map((s) => s.photoTag ?? 'other'), o.zillowData, imported);
}

/** Library project → what the kept row shows. */
function viewFor(projectId: string, project: BlitzProjectDto | undefined, o: Options): KeptRenderView {
  if (o.stalled[projectId] && project?.renderStatus !== 'COMPLETED') {
    return { state: 'failed', error: 'Render is taking too long. Tap Generate to try again.' };
  }
  if (!project) return { state: 'working', queuePosition: o.queue[projectId] };
  if (project.renderStatus === 'FAILED') return { state: 'failed', error: 'Render failed. Try again.' };
  if (project.renderStatus === 'COMPLETED' && project.renderedVideoUrl) {
    return { state: 'ready', videoUrl: project.renderedVideoUrl, projectId: project.id };
  }
  const startedAt = project.renderStatus === 'PROCESSING' && project.renderStartedAt ? Date.parse(project.renderStartedAt) : undefined;
  return { state: 'working', queuePosition: o.queue[projectId], startedAt };
}

/**
 * "Generate" on a kept card: renders it in the background with the card exactly as it is
 * (same body the editor sends), without opening the editor. Status comes from the library,
 * which the render poller keeps up to date.
 */
export function useDeckCardRender(o: Options) {
  const client = useLabClient();
  const [starting, setStarting] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setError = (cardId: string, message: string | null) =>
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[cardId] = message;
      else delete next[cardId];
      return next;
    });

  /** The render request for a card exactly as it is, or why it cannot render yet. Also what scheduling saves. */
  const bodyFor = async (card: DeckCardData): Promise<{ body: RenderBody } | { error: string }> =>
    deckRenderBody(client, card, await slidesFor(card, o, client), { template: o.template, assets: o.assets, textOverride: o.textOverride, checkContext: o.checkContext });

  const run = async (card: DeckCardData): Promise<string | null> => {
    const built = await bodyFor(card);
    if ('error' in built) return built.error;
    let failure = 'Render request failed. Try again.';
    const projectId = await o.submit(built.body, (message) => { failure = message; });
    if (!projectId) return failure;
    o.setDeckCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, status: 'generated', renderProjectId: projectId } : c)));
    logDeckAction(client, card.variantId, 'render', { blitzProjectId: projectId });
    return null;
  };

  const generate = async (card: DeckCardData) => {
    setStarting((prev) => ({ ...prev, [card.id]: true }));
    setError(card.id, null);
    const error = await run(card).catch(() => 'Render request failed. Try again.');
    setError(card.id, error);
    setStarting((prev) => ({ ...prev, [card.id]: false }));
  };

  /** Per-card render view for the kept list. Absent = never generated. */
  const renderFor = (card: DeckCardData): KeptRenderView | undefined => {
    if (starting[card.id]) return { state: 'working' };
    if (errors[card.id]) return { state: 'failed', error: errors[card.id] };
    if (!card.renderProjectId) return undefined;
    return viewFor(card.renderProjectId, o.library.find((p) => p.id === card.renderProjectId), o);
  };

  return { generate, renderFor, bodyFor };
}
