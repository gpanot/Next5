// server-only — never import from a 'use client' file.
// Blitz Lab persistence: templates, assets, and projects in the database; files in R2 by key.

import type { BlitzAsset, BlitzProject, BlitzTemplate } from '@prisma/client';
import { scopedKey, unscopedKey, type LabScope } from '../labs/scope';

// ── R2 key conventions ────────────────────────────────────────────────────────

/**
 * Key builders for one owner. `scope` is a workspace id, or null for Next5's own files —
 * see src/server/labs/scope.ts for why the two layouts differ.
 */
export const blitzKeysFor = (scope: LabScope) => ({
  asset: (assetId: string, ext: string) => scopedKey(scope, `blitz/assets/${assetId}.${ext}`),
  upload: (type: BlitzUploadType, ext: string) =>
    scopedKey(
      scope,
      `blitz/uploads/${type.toLowerCase()}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`,
    ),
  thumbnail: (assetId: string) => scopedKey(scope, `blitz/assets/${assetId}/thumb.jpg`),
  render: (projectId: string) => scopedKey(scope, `blitz/renders/${projectId}/output.mp4`),
});

/** Next5-owned keys — what the admin lab writes. */
export const blitzKeys = blitzKeysFor(null);

// ── Uploads ───────────────────────────────────────────────────────────────────

export type BlitzUploadType = 'BACKGROUND' | 'OVERLAY' | 'AUDIO';

export const BLITZ_UPLOAD_TYPES = new Set<string>(['BACKGROUND', 'OVERLAY', 'AUDIO']);

/** Uploaded files live under this prefix; asset registration only accepts keys inside it. */
export const BLITZ_UPLOAD_PREFIX = 'blitz/uploads/';

/** True when the key is an upload rather than a seeded library asset, in either owner layout. */
export const isBlitzUploadKey = (key: string): boolean =>
  unscopedKey(key).startsWith(BLITZ_UPLOAD_PREFIX);

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
};

/** Which layer types accept which media. */
const KINDS_BY_TYPE: Record<BlitzUploadType, Array<'image' | 'video' | 'audio'>> = {
  OVERLAY: ['video'],
  BACKGROUND: ['video', 'image'],
  AUDIO: ['audio'],
};

export const blitzMediaKind = (fileName: string): 'image' | 'video' | 'audio' => {
  const contentType = blitzUploadFormat(fileName)?.contentType ?? 'video/';
  return contentType.startsWith('image/') ? 'image' : contentType.startsWith('audio/') ? 'audio' : 'video';
};

/** True when a file of this name may be used on this layer. */
export const blitzAcceptsFile = (type: BlitzUploadType, fileName: string): boolean =>
  blitzUploadFormat(fileName) !== null && KINDS_BY_TYPE[type].includes(blitzMediaKind(fileName));

/** Extension + content type for an uploaded file; null when the format is not supported. */
export const blitzUploadFormat = (fileName: string): { ext: string; contentType: string } | null => {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const contentType = CONTENT_TYPE_BY_EXT[ext];
  return contentType ? { ext, contentType } : null;
};

// ── URL helpers ───────────────────────────────────────────────────────────────

/**
 * Returns a same-origin proxy URL for a blitz asset key.
 * The /api/admin/blitz/proxy route streams the R2 object through Next.js,
 * which eliminates browser CORS restrictions (needed for @remotion/media's
 * colorKey WebGL effect) and adds 1-hour browser caching for faster reloads.
 */
export const blitzBrowserUrl = (key: string): Promise<string> =>
  Promise.resolve(`/api/admin/blitz/proxy?key=${encodeURIComponent(key)}`);

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
  /** Derived from the file extension; lets the preview pick <img> vs <video> for blob: URLs. */
  mediaKind: 'image' | 'video' | 'audio';
  /** "library" = curated/seeded (read-only); "upload" = added by the user (rename/delete allowed). */
  source: 'library' | 'upload' | 'hook_library';
  /** Flat tag list — populated for HOOK assets. */
  tags: string[];
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
  /** Set when status transitions to COMPLETED — used to compute render duration. */
  updatedAt: string;
};

export const toAssetDto = async (asset: BlitzAsset): Promise<BlitzAssetDto> => ({
  id: asset.id,
  name: asset.name,
  type: asset.type,
  r2Key: asset.r2Key,
  url: await blitzBrowserUrl(asset.r2Key),
  thumbnailUrl: asset.thumbnailKey ? await blitzBrowserUrl(asset.thumbnailKey) : null,
  mediaKind: blitzMediaKind(asset.r2Key),
  source: isBlitzUploadKey(asset.r2Key) ? 'upload' : asset.source === 'hook_library' ? 'hook_library' : 'library',
  tags: asset.tags ?? [],
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
  updatedAt: project.updatedAt.toISOString(),
});
