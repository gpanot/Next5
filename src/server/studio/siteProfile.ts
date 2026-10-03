// server-only — never import from a 'use client' file.
// One company profile per website and workspace, shared by Blitz (Campaign Studio runs) and Auto Slideshow.
// Auto Slideshow reuses the newest profile for its site; it extracts one only when none exists yet, or when the
// newest one predates the site text and brand summary (2026-10-02). Hand edits (locked or manual fields) carry over to the new version.

import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { isManualSource } from '../../lib/manualProfile';
import type { BrandProfile } from '../../types/admin/companyIntel';
import { domainOf, normalizeUrl } from '../companyIntel/profile';
import type { CostMeter } from '../metaAds/cost';
import { toBrandProfile } from './brandProfileAdapter';
import { extractProfile } from './profileExtractor';
import type { StudioProfileData } from './types';

export type SiteProfile = { id: string; profile: BrandProfile };

type ProfileRow = { id: string; sourceUrl: string; version: number; data: Prisma.JsonValue };

const SECTIONS = ['classification', 'identity', 'positioning', 'market', 'tone', 'visual', 'brand'] as const;

const sameSite = (a: string, b: string): boolean => {
  try {
    return normalizeUrl(a).replace(/^https?:\/\/(www\.)?/, '') === normalizeUrl(b).replace(/^https?:\/\/(www\.)?/, '');
  } catch {
    return false;
  }
};

/** Profiles with real data (not the empty row a Studio run starts with), newest first. */
async function latestForSite(url: string, workspaceId: string | null): Promise<ProfileRow | null> {
  const rows = await prisma.studioBrandProfile.findMany({
    where: { workspaceId, sourceUrl: { contains: domainOf(url) } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, sourceUrl: true, version: true, data: true },
    take: 20,
  });
  return rows.find((r) => !isManualSource(r.sourceUrl) && sameSite(r.sourceUrl, url) && hasData(r.data)) ?? null;
}

function hasData(data: Prisma.JsonValue): boolean {
  return Boolean(data && typeof data === 'object' && 'identity' in data);
}

function isEdited(field: unknown): boolean {
  if (!field || typeof field !== 'object') return false;
  const f = field as { locked?: unknown; source?: unknown };
  return f.locked === true || f.source === 'manual';
}

/** The fresh extraction, with every field a person edited or locked in the old version kept as it was. */
export function keepEdits(fresh: StudioProfileData, old: StudioProfileData): StudioProfileData {
  const merged = { ...fresh } as Record<string, unknown>;
  for (const section of SECTIONS) {
    const oldSection = old[section] as Record<string, unknown> | undefined;
    if (!oldSection) continue;
    const kept = Object.entries(oldSection).filter(([, field]) => isEdited(field));
    if (kept.length > 0) merged[section] = { ...(fresh[section] ?? {}), ...Object.fromEntries(kept) };
  }
  if (old.products) merged.products = old.products;
  return merged as StudioProfileData;
}

async function extractNew(url: string, workspaceId: string | null, previous: ProfileRow | null, meter: CostMeter): Promise<SiteProfile> {
  const sourceUrl = previous?.sourceUrl ?? url;
  const { data: fresh, telemetry } = await extractProfile({ sourceUrl, skipMarketResearch: true });
  meter.add('Profile (site crawl + OpenAI)', telemetry.totalCostUsdMicros);
  if (!fresh.siteText) throw new Error(`Could not read ${url}`);
  const data = previous ? keepEdits(fresh, previous.data as unknown as StudioProfileData) : fresh;
  const row = await prisma.studioBrandProfile.create({
    data: { sourceUrl, workspaceId, version: (previous?.version ?? 0) + 1, data: data as unknown as Prisma.InputJsonValue, crawl: telemetry as unknown as Prisma.InputJsonValue },
  });
  return { id: row.id, profile: toBrandProfile(data, sourceUrl) };
}

/** The site's shared profile as Auto Slideshow's BrandProfile, extracting it first when needed. */
export async function profileForSite(url: string, workspaceId: string | null, meter: CostMeter): Promise<SiteProfile> {
  const latest = await latestForSite(url, workspaceId);
  const data = latest?.data as unknown as StudioProfileData | undefined;
  if (latest && data?.siteText && data.brand) return { id: latest.id, profile: toBrandProfile(data, latest.sourceUrl) };
  return extractNew(url, workspaceId, latest, meter);
}
