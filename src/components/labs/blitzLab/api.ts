'use client';

import type { LabClient } from '../labClient';
import type { BlitzAssetDto, BlitzProjectDto, BlitzTemplateDto } from '../../../server/admin/blitzStore';

export type { LabClient };

export type { BlitzAssetDto, BlitzProjectDto, BlitzTemplateDto };

const BASE = '/blitz';

type BlitzLayerType = 'BACKGROUND' | 'OVERLAY' | 'AUDIO' | 'HOOK';

type AutoFitRect = { x: number; y: number; w: number; h: number };

/** The layer "Remix it!" keeps as-is. */
export type RemixLayer = 'caption' | 'overlay' | 'background' | 'audio';

export const blitzApi = {
  listTemplates: (client: LabClient) =>
    client.request<{ templates: BlitzTemplateDto[] }>(`${BASE}/templates`),

  listAssets: (client: LabClient, type?: string) =>
    client.request<{ assets: BlitzAssetDto[] }>(`${BASE}/assets${type ? `?type=${type}` : ''}`),

  getProject: (client: LabClient, id: string) =>
    client.request<{ project: BlitzProjectDto }>(`${BASE}/projects/${id}`),

  listCompleted: (client: LabClient) =>
    client.request<{ projects: BlitzProjectDto[] }>(`${BASE}/projects`),

  generateCaption: (
    client: LabClient,
    body: { captionText?: string; mentionBusiness?: boolean; businessText?: string; regenPrompt?: string },
  ) => client.request<{ caption: string }>(`${BASE}/generate-caption`, { json: body }),

  /** "Remix it!": keep one layer, let the model pick a new combination of the others. */
  remix: (
    client: LabClient,
    body: {
      locked: RemixLayer[];
      captionText: string;
      overlayKey: string;
      backgroundKey: string;
      audioKey?: string;
      businessText?: string;
      hint?: string;
    },
  ) =>
    client.request<{
      locked: RemixLayer[];
      captionText: string;
      overlayKey: string;
      backgroundKey: string;
      audioKey: string | null;
      reason: string;
      usedVectors: boolean;
    }>(`${BASE}/remix`, { json: body }),

  /** "Auto Fit": the model places the meme and caption from a first-frame snapshot. */
  autoFit: (
    client: LabClient,
    body: {
      backgroundJpeg: string;
      compositeJpeg: string;
      captionText: string;
      layout: {
        subjectBase: AutoFitRect;
        subjectNow: AutoFitRect;
        caption: AutoFitRect;
        business: AutoFitRect | null;
      };
    },
  ) =>
    client.request<{
      overlayZoom: number;
      overlayOffsetX: number;
      overlayOffsetY: number;
      captionPositionY: number;
      captionOffsetX: number;
      reason: string;
    }>(`${BASE}/auto-fit`, { json: body }),

  triggerRender: (
    client: LabClient,
    body: {
      templateId: string;
      currentAssets: { backgroundKey: string; overlayKey?: string; audioKey?: string };
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
      /** Slide data for CAROUSEL templates — SlideData[] with per-slide backgroundKey support */
      slides?: Array<{ text: string; backgroundKey?: string; durationSec?: number; trimStart?: number; positionY?: number }>;
      /** Remix data saved with the render (see slideshowSet.ts). */
      set?: object;
    },
  ) =>
    client.request<{ projectId: string; status: string; project: BlitzProjectDto }>(`${BASE}/render`,
      { json: body },
    ),

  /** Presigned PUT URL for a direct browser → R2 upload. */
  getUploadUrl: (client: LabClient, type: BlitzLayerType, fileName: string) =>
    client.request<{ r2Key: string; uploadUrl: string; contentType: string }>(`${BASE}/upload-url`,
      { json: { type, fileName } },
    ),

  /** Save an uploaded R2 file as a library asset. */
  registerAsset: (client: LabClient, body: { type: BlitzLayerType; r2Key: string; name: string }) =>
    client.request<{ asset: BlitzAssetDto }>(`${BASE}/assets`, { json: body }),

  /** Rename one of the user's uploads. */
  renameAsset: (client: LabClient, id: string, name: string) =>
    client.request<{ asset: BlitzAssetDto }>(`${BASE}/assets/${id}`, { method: 'PATCH', json: { name } }),

  /** Delete one of the user's uploads (DB row + R2 file). */
  deleteAsset: (client: LabClient, id: string) =>
    client.request<{ ok: boolean }>(`${BASE}/assets/${id}`, { method: 'DELETE' }),

  /** Delete a rendered project (DB row + R2 video). */
  deleteProject: (client: LabClient, id: string) =>
    client.request<{ ok: boolean }>(`${BASE}/projects/${id}`, { method: 'DELETE' }),

  /** Generate an AI background image via GPT-image-2 (9:16, 1k ≈ $0.03/image). */
  generateBackground: (client: LabClient, prompt: string) =>
    client.request<{ asset: BlitzAssetDto }>(`${BASE}/generate-background`, { json: { prompt } }),
};
