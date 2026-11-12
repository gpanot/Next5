'use client';

/** Client calls for the realtor Autopilot (playbook campaigns). */
import { apiFetch } from '../../../lib/apiClient';
import type { MarketArea } from '../../../lib/marketArea';
import type { PlaybookId } from '../../../lib/realtorPlaybooks';
import { isDisclosureValid, type DisclosureDraft } from './DisclosureForm';
import type { AreaDraft } from './MarketAreaForm';
import type { MarketInfo } from './WhatStep';
import type { CampaignDto } from '../../../types/business/campaigns';

export type CreatePlaybookBody = {
  playbook: PlaybookId;
  listingId: string | null;
  startDate: string;
  channels: string[];
  event?: { start: string; end: string | null; source: 'zillow' | 'typed' } | null;
  newPriceUsd?: number | null;
  oldPriceUsd?: number | null;
};

export const createPlaybook = (body: CreatePlaybookBody) =>
  apiFetch<{ campaign: CampaignDto }>('/api/app/campaigns/playbook', { method: 'POST', json: body }).then((r) => r.campaign);

export const getPlaybook = (id: string) =>
  apiFetch<{ campaign: CampaignDto }>(`/api/app/campaigns/${id}?product=brand`).then((r) => r.campaign);

export const skipPost = (id: string, postId: string, skipped: boolean) =>
  apiFetch<{ campaign: CampaignDto }>(`/api/app/campaigns/${id}/posts/${postId}`, { method: 'PATCH', json: { product: 'brand', skipped } }).then((r) => r.campaign);

export const approvePlaybook = (id: string) =>
  apiFetch<{ campaign: CampaignDto }>(`/api/app/campaigns/${id}/approve`, { method: 'POST' }).then((r) => r.campaign);

export const retryPost = (id: string, postId: string) =>
  apiFetch<{ campaign: CampaignDto }>(`/api/app/campaigns/${id}/posts/${postId}/retry`, { method: 'POST' }).then((r) => r.campaign);

export const discardPlaybook = (id: string) => apiFetch<{ ok: boolean }>(`/api/app/campaigns/${id}?product=brand`, { method: 'DELETE' });

export type MarketAreaResponse = {
  marketArea: MarketArea | null;
  suggested: MarketArea | null;
  paid: boolean;
  disclosure: { agentName: string; brokerage: string };
};

/** Saved area first, else the city of her listings, else blank. */
export const toMarketInfo = (r: MarketAreaResponse | null): MarketInfo | null => {
  if (!r) return null;
  const a = r.marketArea ?? r.suggested;
  return {
    paid: r.paid,
    area: { city: a?.city ?? '', state: a?.state ?? '', zips: a?.zips.join(', ') ?? '' },
    disclosure: r.disclosure,
    hasDisclosure: isDisclosureValid(r.disclosure),
  };
};

export const saveDisclosure = (d: DisclosureDraft) =>
  apiFetch<{ disclosure: DisclosureDraft }>('/api/app/autopilot/disclosure', { method: 'PUT', json: { agentName: d.agentName, brokerage: d.brokerage } });

export const saveMarketArea = (a: AreaDraft) =>
  apiFetch<{ marketArea: MarketArea }>('/api/app/autopilot/market-area', {
    method: 'PUT',
    json: { city: a.city, state: a.state, zips: a.zips.split(/[\s,]+/).filter(Boolean) },
  });
