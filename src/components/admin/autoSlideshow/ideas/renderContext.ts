'use client';

import { BLITZ_SLIDESHOW_TEXT_DEFAULTS } from '../../../../config/blitzLab';
import { blitzApi } from '../../../labs/blitzLab/api';
import type { RenderBodyContext } from '../../../labs/blitzLab/deckRenderBody';
import type { LabClient } from '../../../labs/labClient';

/**
 * What a Blitz idea's render request needs, as the Content page's deck loads it: the carousel template and the
 * workspace's assets (for a default track). Text: the editor's Default style (74 px, no stroke), so a planned video
 * looks like its idea card and opens in the editor with "Default" selected.
 */
export async function loadRenderContext(client: LabClient): Promise<RenderBodyContext> {
  const [templates, assets] = await Promise.all([blitzApi.listTemplates(client), blitzApi.listAssets(client)]);
  if (!templates.ok || !assets.ok) throw new Error('Could not load the video template. Try again.');
  return {
    template: (templates.data.templates ?? []).find((t) => t.type === 'CAROUSEL') ?? null,
    assets: assets.data.assets ?? [],
    textOverride: { ...BLITZ_SLIDESHOW_TEXT_DEFAULTS },
    checkContext: null,
  };
}
