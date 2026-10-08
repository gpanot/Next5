/**
 * Admin workspace page — client-safe types. One user's workspace as the admin sees it: who owns it, its runs, the full
 * brand extraction, and the matrices its slideshows and Blitz cards are picked from.
 */

import type { BankMatrixDto } from './slideshowBank';

/** One workspace in the Users tab's expanded row. */
export type UserWorkspaceDto = {
  id: string;
  name: string;
  product: string;
  websiteUrl: string | null;
  deleted: boolean;
  createdAt: string;
};

export type WorkspaceRunDto = {
  id: string;
  url: string;
  status: string;
  count: number;
  slideshows: number;
  createdAt: string;
};

export type WorkspaceDetailDto = {
  workspace: {
    id: string;
    name: string;
    product: string;
    websiteUrl: string | null;
    industry: string | null;
    brandColors: string[];
    deleted: boolean;
    createdAt: string;
  };
  owner: { id: string; email: string; createdAt: string };
  social: { provider: string; username: string | null }[];
  runs: WorkspaceRunDto[];
  counts: { slideshows: number; posts: number; blitzVideos: number; blitzCards: number };
};

/** One saved company profile (studio_brand_profiles): field envelopes plus crawl telemetry. */
export type BrandProfileSnapshot = {
  id: string;
  sourceUrl: string;
  version: number;
  createdAt: string;
  data: unknown;
  crawl: unknown;
};

export type WorkspaceBrandDto = {
  /** Workspace.brandExtract: the rich profile read from the website at signup. */
  brandExtract: unknown;
  brandExtractAt: string | null;
  /** The latest profile per website. */
  profiles: BrandProfileSnapshot[];
  /** The latest run's step-1 profile, the one its slideshows were written from. */
  runProfile: { runId: string; profile: unknown } | null;
};

/** One website's Slideshow Bank, read through the workspace's latest run on that site. */
export type WorkspaceBankMatrix = { url: string; runId: string; matrix: BankMatrixDto };

/** Blitz deck cards (slideshow_variants) of one lens × archetype cell, by status. */
export type BlitzCardCell = { lens: string; archetype: string; total: number; byStatus: Record<string, number> };

export type BlitzCardMatrixDto = { lenses: string[]; archetypes: string[]; cells: BlitzCardCell[]; total: number };

export type WorkspaceMatrixDto = { banks: WorkspaceBankMatrix[]; blitz: BlitzCardMatrixDto };

/** One Blitz Script Bank story: its lines, its hooks, and how many idea cards the workspace got from it. */
export type BlitzBankStoryDto = {
  id: string;
  lines: Array<{ label: string; text: string }>;
  hooks: Array<{ archetype: string; text: string }>;
  used: number;
};

export type BlitzBankAudienceDto = { idc: string; categories: string[]; tone: string; proofNote: string; stories: BlitzBankStoryDto[] };

/** One site profile's Blitz Script Bank (audiences × stories × hooks), as the admin sees it. */
export type BlitzBankDto = {
  id: string;
  sourceUrl: string;
  /** 'building' | 'ready' | 'growing' | 'failed' */
  status: string;
  error: string | null;
  costMicros: number;
  createdAt: string;
  updatedAt: string;
  audiences: BlitzBankAudienceDto[];
};

export type BlitzBankMatrixDto = { banks: BlitzBankDto[] };
