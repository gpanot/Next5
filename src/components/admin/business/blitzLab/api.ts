'use client';

import { ugcRequest } from '../ugcLab/api';
import type { BlitzAssetDto, BlitzProjectDto, BlitzTemplateDto } from '../../../../server/admin/blitzStore';

export { ugcRequest };

export type { BlitzAssetDto, BlitzProjectDto, BlitzTemplateDto };

const BASE = '/api/admin/blitz';

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
    body: { captionText?: string; mentionBusiness?: boolean; regenPrompt?: string },
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
    },
  ) =>
    ugcRequest<{ projectId: string; status: string; project: BlitzProjectDto }>(
      token,
      `${BASE}/render`,
      { json: body },
    ),
};
