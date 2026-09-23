'use client';

import { ugcRequest } from '../ugcLab/api';
import type { BlitzAssetDto, BlitzProjectDto, BlitzTemplateDto } from '../../../../server/admin/blitzStore';

export { ugcRequest };

export type { BlitzAssetDto, BlitzProjectDto, BlitzTemplateDto };

const BASE = '/api/admin/blitz';

type BlitzLayerType = 'BACKGROUND' | 'OVERLAY' | 'AUDIO';

export const blitzApi = {
  listTemplates: (token: string) =>
    ugcRequest<{ templates: BlitzTemplateDto[] }>(token, `${BASE}/templates`),

  listAssets: (token: string, type?: string) =>
    ugcRequest<{ assets: BlitzAssetDto[] }>(
      token,
      `${BASE}/assets${type ? `?type=${type}` : ''}`,
    ),

  getProject: (token: string, id: string) =>
    ugcRequest<{ project: BlitzProjectDto }>(token, `${BASE}/projects/${id}`),

  listCompleted: (token: string) =>
    ugcRequest<{ projects: BlitzProjectDto[] }>(token, `${BASE}/projects`),

  generateCaption: (
    token: string,
    body: { captionText?: string; mentionBusiness?: boolean; businessText?: string; regenPrompt?: string },
  ) => ugcRequest<{ caption: string }>(token, `${BASE}/generate-caption`, { json: body }),

  triggerRender: (
    token: string,
    body: {
      templateId: string;
      currentAssets: { backgroundKey: string; overlayKey: string; audioKey?: string };
      overlayZoom: number;
      overlayOffsetX: number;
      overlayOffsetY: number;
      mentionBusiness: boolean;
      regenPrompt?: string;
      captionText: string;
      isIdentifiablePerson?: boolean;
      textConfigOverride?: Record<string, unknown>;
      durationSeconds?: number;
      businessText?: string;
      muteVideoAudio?: boolean;
    },
  ) =>
    ugcRequest<{ projectId: string; status: string; project: BlitzProjectDto }>(
      token,
      `${BASE}/render`,
      { json: body },
    ),

  /** Presigned PUT URL for a direct browser → R2 upload. */
  getUploadUrl: (token: string, type: BlitzLayerType, fileName: string) =>
    ugcRequest<{ r2Key: string; uploadUrl: string; contentType: string }>(
      token,
      `${BASE}/upload-url`,
      { json: { type, fileName } },
    ),

  /** Save an uploaded R2 file as a library asset. */
  registerAsset: (token: string, body: { type: BlitzLayerType; r2Key: string; name: string }) =>
    ugcRequest<{ asset: BlitzAssetDto }>(token, `${BASE}/assets`, { json: body }),

  /** Rename one of the user's uploads. */
  renameAsset: (token: string, id: string, name: string) =>
    ugcRequest<{ asset: BlitzAssetDto }>(token, `${BASE}/assets/${id}`, { method: 'PATCH', json: { name } }),

  /** Delete one of the user's uploads (DB row + R2 file). */
  deleteAsset: (token: string, id: string) =>
    ugcRequest<{ ok: boolean }>(token, `${BASE}/assets/${id}`, { method: 'DELETE' }),

  /** Delete a rendered project (DB row + R2 video). */
  deleteProject: (token: string, id: string) =>
    ugcRequest<{ ok: boolean }>(token, `${BASE}/projects/${id}`, { method: 'DELETE' }),
};
