/** Campaign shapes shared by the wizard and the campaigns list. */
import type { AssetRequirementDto } from '../../lib/contentTemplates';

export type CampaignGoalDto = 'leads' | 'enquiries' | 'sell';
export type ContentSourceDto = 'real' | 'mix' | 'generated';
export type CampaignStatusDto = 'draft' | 'generated' | 'scheduled' | 'archived';

export type CampaignPostDto = {
  id: string;
  dayIndex: number;
  slotOfDay: string;
  date: string;
  purpose: string;
  source: ContentSourceDto;
  skipped: boolean;
  /** True when no template matched the day's purpose and the matcher had to widen. */
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
  requiredUploads: AssetRequirementDto[];
};

export type CampaignDto = {
  id: string;
  workspaceId: string;
  goal: CampaignGoalDto;
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
  status: CampaignStatusDto;
  step: number;
  scheduledAt: string | null;
  createdAt: string;
  posts: CampaignPostDto[];
  /** Pieces of content. Skipped days are planned but never made. */
  postCount: number;
  /** Calendar rows once scheduled — one per post per channel. */
  slotCount: number;
};

export type AssetGapDto = {
  postId: string;
  date: string;
  templateName: string;
  missing: { kind: string; label: string }[];
};
