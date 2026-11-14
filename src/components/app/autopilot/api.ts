'use client';

/** Client calls for the realtor Autopilot (playbook campaigns). */
import { apiFetch } from '../../../lib/apiClient';
import type { MarketCity, MarketPlaces } from '../../../lib/marketPlaces';
import type { PlaybookId } from '../../../lib/realtorPlaybooks';
import { isDisclosureValid, type DisclosureDraft } from './DisclosureForm';
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
  /** Market update: one post day per place, cities then the state (placesDraft.postDates). */
  placeDates?: string[] | null;
  /** Days picked on the Dates step; a day can repeat (two posts the same day). */
  postDates?: string[] | null;
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

export const approvePost = (id: string, postId: string, approved: boolean) =>
  apiFetch<{ campaign: CampaignDto }>(`/api/app/campaigns/${id}/posts/${postId}/approve`, { method: 'POST', json: { approved } }).then((r) => r.campaign);

export const discardPlaybook = (id: string) => apiFetch<{ ok: boolean }>(`/api/app/campaigns/${id}?product=brand`, { method: 'DELETE' });

export type MarketAreaResponse = {
  places: MarketPlaces | null;
  /** Her listings' city, else her IP city: a first guess with no location prompt. */
  suggestedBase: MarketCity | null;
  /** Days (YYYY-MM-DD) of the next 6 weeks that already hold a post. */
  busyDates: string[];
  paid: boolean;
  disclosure: { agentName: string; brokerage: string };
};

export const toMarketInfo = (r: MarketAreaResponse | null): MarketInfo | null => {
  if (!r) return null;
  return {
    paid: r.paid,
    places: r.places,
    suggestedBase: r.suggestedBase,
    busyDates: r.busyDates ?? [],
    disclosure: r.disclosure,
    hasDisclosure: isDisclosureValid(r.disclosure),
  };
};

export const saveDisclosure = (d: DisclosureDraft) =>
  apiFetch<{ disclosure: DisclosureDraft }>('/api/app/autopilot/disclosure', { method: 'PUT', json: { agentName: d.agentName, brokerage: d.brokerage } });

export const saveMarketPlaces = (p: MarketPlaces) =>
  apiFetch<{ places: MarketPlaces }>('/api/app/autopilot/market-area', { method: 'PUT', json: { cities: p.cities, state: p.state } });

/** Her city (from a point or a typed city) and the cities around it, closest first. */
export const findNearby = (from: { lat: number; lng: number } | MarketCity) =>
  apiFetch<{ base: MarketCity; nearby: MarketCity[] }>('/api/app/autopilot/market-area/nearby', { method: 'POST', json: from });
