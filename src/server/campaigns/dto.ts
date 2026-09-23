/**
 * Wire shapes for campaigns. Every post carries its template's asset requirements, so the wizard
 * never has to ask the library a second question to render a day.
 */
import type { Campaign, CampaignPost, CampaignStatus, ContentPurpose, ContentSource } from '@prisma/client';
import type { AssetRequirementDto } from '../templates/dto';

export type CampaignPostDto = {
  id: string;
  dayIndex: number;
  slotOfDay: string;
  date: string;
  purpose: ContentPurpose;
  source: ContentSource;
  skipped: boolean;
  widened: boolean;
  caption: string | null;
  templateId: string;
  templateName: string;
  templateSlug: string;
  versionId: string;
  version: number;
  pillarName: string;
  formatSlug: string;
  hookPattern: string;
  recommendedEngine: string;
  assetRequirements: AssetRequirementDto[];
  /** Only what she must supply herself — the subset that can block scheduling. */
  requiredUploads: AssetRequirementDto[];
};

export type CampaignDto = {
  id: string;
  workspaceId: string;
  goal: Campaign['goal'];
  productId: string | null;
  listingId: string | null;
  channels: string[];
  campaignSubject: string | null;
  campaignMessage: string | null;
  useBrandSubject: boolean;
  useBrandMessage: boolean;
  promo: string | null;
  notes: string | null;
  postsPerDay: number;
  weeks: number;
  startDate: string;
  assetMethod: string | null;
  assetUrl: string | null;
  status: CampaignStatus;
  step: number;
  scheduledAt: string | null;
  createdAt: string;
  posts: CampaignPostDto[];
  /** Posts that count toward a total: skipped days are planned but never made. */
  postCount: number;
  /** Rows written to the calendar when scheduled — one per post per channel. */
  slotCount: number;
};

export type PostRow = CampaignPost & {
  template: { name: string; slug: string; pillar: { name: string }; formatSlug: string; recommendedEngine: string };
  version: {
    version: number;
    hookPattern: string;
    assetRequirements: { kind: string; required: boolean; minCount: number; fulfilment: string; notes: string | null }[];
  };
};

export type CampaignRow = Campaign & { posts: PostRow[] };
