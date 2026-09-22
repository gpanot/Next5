// server-only — never import from a 'use client' file.
// Blitz Lab persistence: templates, assets, and projects in the database; files in R2 by key.

import type { BlitzAsset, BlitzProject, BlitzTemplate } from '@prisma/client';
import { getPresignedUrl } from '../../lib/r2';
import { HttpError } from '../http';

/** How long browser-facing signed links are valid. */
const BROWSER_LINK_SECONDS = 24 * 60 * 60;

// ── R2 key conventions ────────────────────────────────────────────────────────

export const blitzKeys = {
  asset: (assetId: string, ext: string) => `blitz/assets/${assetId}.${ext}`,
  thumbnail: (assetId: string) => `blitz/assets/${assetId}/thumb.jpg`,
  render: (projectId: string) => `blitz/renders/${projectId}/output.mp4`,
};

// ── URL helpers ───────────────────────────────────────────────────────────────

const sign = async (key: string, seconds = BROWSER_LINK_SECONDS): Promise<string> => {
  const url = await getPresignedUrl(key, seconds);
  if (!url) throw new HttpError(503, 'r2_required', 'Blitz Lab needs R2 configured to serve files.');
  return url;
};

export const blitzBrowserUrl = (key: string) => sign(key, BROWSER_LINK_SECONDS);

// ── DTOs ──────────────────────────────────────────────────────────────────────

export type BlitzAssetDto = {
  id: string;
  name: string;
  type: string;
  /** R2 object key — used as the canonical swap key stored in BlitzProject.currentAssets */
  r2Key: string;
  /** Signed browser URL (24-hour validity) */
  url: string;
  thumbnailUrl: string | null;
  createdAt: string;
};

export type BlitzTemplateDto = {
  id: string;
  name: string;
  type: string;
  defaultAssets: unknown;
  textConfig: unknown;
  defaultHookText: string;
  remixPrompt: string;
  durationSeconds: number;
  fps: number;
  createdAt: string;
};

export type BlitzProjectDto = {
  id: string;
  templateId: string;
  currentAssets: unknown;
  overlayZoom: number;
  overlayOffsetX: number;
  overlayOffsetY: number;
  mentionBusiness: boolean;
  regenPrompt: string | null;
  captionText: string;
  renderStatus: string;
  renderedVideoUrl: string | null;
  isIdentifiablePerson: boolean;
  createdAt: string;
};

export const toAssetDto = async (asset: BlitzAsset): Promise<BlitzAssetDto> => ({
  id: asset.id,
  name: asset.name,
  type: asset.type,
  r2Key: asset.r2Key,
  url: await blitzBrowserUrl(asset.r2Key),
  thumbnailUrl: asset.thumbnailKey ? await blitzBrowserUrl(asset.thumbnailKey) : null,
  createdAt: asset.createdAt.toISOString(),
});

export const toTemplateDto = (template: BlitzTemplate): BlitzTemplateDto => ({
  id: template.id,
  name: template.name,
  type: template.type,
  defaultAssets: template.defaultAssets,
  textConfig: template.textConfig,
  defaultHookText: template.defaultHookText,
  remixPrompt: template.remixPrompt,
  durationSeconds: template.durationSeconds,
  fps: template.fps,
  createdAt: template.createdAt.toISOString(),
});

export const toProjectDto = async (project: BlitzProject): Promise<BlitzProjectDto> => ({
  id: project.id,
  templateId: project.templateId,
  currentAssets: project.currentAssets,
  overlayZoom: project.overlayZoom,
  overlayOffsetX: project.overlayOffsetX,
  overlayOffsetY: project.overlayOffsetY,
  mentionBusiness: project.mentionBusiness,
  regenPrompt: project.regenPrompt,
  captionText: project.captionText,
  renderStatus: project.renderStatus,
  renderedVideoUrl: project.renderedVideoKey
    ? await blitzBrowserUrl(project.renderedVideoKey)
    : null,
  isIdentifiablePerson: project.isIdentifiablePerson,
  createdAt: project.createdAt.toISOString(),
});
