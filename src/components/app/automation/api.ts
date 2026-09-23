'use client';

/** Client calls for the campaign wizard. The draft is the row, so every step writes here. */
import { apiFetch } from '../../../lib/apiClient';
import type { TemplateDto } from '../../../lib/contentTemplates';
import type { AssetGapDto, CampaignDto, CampaignGoalDto } from '../../../types/business/campaigns';
import type { ProductLineDto } from '../../../types/business/me';

type Product = ProductLineDto;

export const listCampaigns = (product: Product) =>
  apiFetch<{ campaigns: CampaignDto[] }>(`/api/app/campaigns?product=${product}`).then((r) => r.campaigns);

export const getCampaign = (product: Product, id: string) =>
  apiFetch<{ campaign: CampaignDto }>(`/api/app/campaigns/${id}?product=${product}`).then((r) => r.campaign);

export const startCampaign = (
  product: Product,
  body: { goal: CampaignGoalDto; channels: string[]; startDate: string; productId?: string; listingId?: string },
) =>
  apiFetch<{ campaign: CampaignDto }>('/api/app/campaigns', { method: 'POST', json: { product, ...body } }).then((r) => r.campaign);

export const patchCampaign = (product: Product, id: string, body: Record<string, unknown>) =>
  apiFetch<{ campaign: CampaignDto }>(`/api/app/campaigns/${id}`, { method: 'PATCH', json: { product, ...body } }).then((r) => r.campaign);

export const buildPlan = (product: Product, id: string) =>
  apiFetch<{ campaign: CampaignDto }>(`/api/app/campaigns/${id}/plan`, { method: 'POST', json: { product } }).then((r) => r.campaign);

export const swapOptions = (product: Product, id: string, postId: string) =>
  apiFetch<{ templates: TemplateDto[] }>(`/api/app/campaigns/${id}/posts/${postId}?product=${product}`).then((r) => r.templates);

export const patchPost = (product: Product, id: string, postId: string, body: Record<string, unknown>) =>
  apiFetch<{ campaign: CampaignDto }>(`/api/app/campaigns/${id}/posts/${postId}`, { method: 'PATCH', json: { product, ...body } }).then((r) => r.campaign);

export const readGaps = (product: Product, id: string) =>
  apiFetch<{ gaps: AssetGapDto[]; postCount: number; slotCount: number }>(`/api/app/campaigns/${id}/schedule?product=${product}`);

export const scheduleCampaign = (product: Product, id: string) =>
  apiFetch<{ campaign: CampaignDto }>(`/api/app/campaigns/${id}/schedule`, { method: 'POST', json: { product } }).then((r) => r.campaign);

export const archiveCampaign = (product: Product, id: string) =>
  apiFetch<{ ok: boolean }>(`/api/app/campaigns/${id}?product=${product}`, { method: 'DELETE' });
