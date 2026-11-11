// server-only — never import from a 'use client' file.
// The CTA "Generate the entire slideshows" writes on an empty CTA card: the site's first Slideshow Bank CTA (as the
// Prospect Pack's Hooks Volume does), else a plain follow line.

import { prisma } from '../../../lib/db';
import type { SlideshowBankContent } from '../../../types/admin/slideshowBank';
import { MAX_CARD_BODY_CHARS, MAX_CARD_TITLE_CHARS, type CampaignCtaText } from '../../../types/admin/slideshowCampaign';

const FALLBACK: CampaignCtaText = { title: 'Follow for more', body: '' };

export const campaignCta = async (workspaceId: string | null): Promise<CampaignCtaText> => {
  if (!workspaceId) return FALLBACK;
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { websiteUrl: true } });
  const bank = workspace?.websiteUrl ? await prisma.slideshowBank.findUnique({ where: { url: workspace.websiteUrl }, select: { content: true } }) : null;
  const cta = (bank?.content as unknown as SlideshowBankContent | undefined)?.ctas[0];
  return cta?.title ? { title: cta.title.slice(0, MAX_CARD_TITLE_CHARS), body: (cta.body ?? '').slice(0, MAX_CARD_BODY_CHARS) } : FALLBACK;
};
