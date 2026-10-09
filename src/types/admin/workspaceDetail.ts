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

/** One Blitz card the workspace got from a bank story, as its slides read: hook, meat lines, CTA. */
export type BlitzStoryCardDto = {
  id: string;
  archetype: string;
  /** slideshow_variants status: 'proposed' | 'kept' | 'discarded' | 'edited' | 'rendered' | 'failed' */
  status: string;
  plannedAt: string | null;
  createdAt: string;
  hook: string;
  meat: Array<{ label: string; text: string }>;
  cta: string;
  /** The story's other hooks, offered to the user as this card's other first lines. */
  otherHooks: string[];
};

/** One calendar idea on the admin's day-by-day plan: a Blitz card (hook, meat, CTA) or a slideshow (hook, outline). */
export type IdeaPlanItemDto = {
  id: string;
  plannedAt: string;
  /** slideshow_variants status: 'proposed' | 'kept' | 'discarded' | 'made' … */
  status: string;
  format: 'blitz' | 'slideshow';
  /** Campaign stage: "Attention" | "Trust" | "Proof" | "Conversion" ('' when unknown). */
  stage: string;
  /** Campaign week of its day: "Week 3 · Prove it works". */
  week: string;
  /** Blitz story format ("Myth → truth"…); '' for slideshows. */
  storyFormat: string;
  /** Hook style (Blitz) or content goal (slideshow). */
  kind: string;
  /** "Story n" of the Blitz Script Bank; empty for slideshows. */
  story: string;
  hook: string;
  meat: Array<{ label: string; text: string }>;
  cta: string;
  outline: string[];
  otherHooks: string[];
};

/** One Blitz Script Bank story: its lines, its hooks, and the idea cards the workspace got from it. */
export type BlitzBankStoryDto = {
  id: string;
  /** Campaign stage and story format ("Attention", "Myth → truth"). */
  stage: string;
  format: string;
  /** What the story was written about (picked ahead so stories differ); '' for older stories. */
  trigger: string;
  lines: Array<{ label: string; text: string }>;
  hooks: Array<{ archetype: string; text: string }>;
  used: number;
  cards: BlitzStoryCardDto[];
};

/** One list of an audience's trigger bank, each line marked when a story is about it. */
export type CampaignTriggerListDto = { label: string; items: Array<{ text: string; used: boolean }> };

export type BlitzBankAudienceDto = {
  idc: string; categories: string[]; tone: string; proofNote: string; stories: BlitzBankStoryDto[];
  /** The audience's campaign: commercial goal, the action a ready viewer takes, and its trigger bank ('' / [] before). */
  objective: string;
  action: string;
  triggers: CampaignTriggerListDto[];
};

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

/** One learned score: a story format or hook type, its smoothed score (about −3…+3) and the cards behind it. */
export type LearnedScoreDto = { label: string; score: number; cards: number };

/** What the workspace's Blitz cards taught the bank (swipes, then views once posted). */
export type BlitzLearningDto = {
  kept: number;
  skipped: number;
  posted: number;
  medianViews: number | null;
  formats: LearnedScoreDto[];
  hooks: LearnedScoreDto[];
  winners: Array<{ story: string; views: number; ratio: number }>;
};

export type BlitzBankMatrixDto = { plan: IdeaPlanItemDto[]; learning: BlitzLearningDto; banks: BlitzBankDto[] };
