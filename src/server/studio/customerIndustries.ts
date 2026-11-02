// server-only — never import from a 'use client' file.
// Reads and edits the client types on a workspace's company profile. A saved list is `manual`, so a new extraction keeps
// it (keepEdits in siteProfile.ts). A changed list also rewrites the Audience, which carousels and the brand card read;
// the banks follow after the response (followIndustriesEdit.ts).

import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import {
  cleanIndustries, MAX_CUSTOMER_INDUSTRIES, MAX_INDUSTRY_CHARS, suggestedIndustries, usedIndustries, type CustomerIndustriesDto,
} from '../../lib/customerIndustries';
import type { BrandProfile } from '../../types/admin/companyIntel';
import { chatJson } from '../ai/openai';
import { onboardingOpen } from '../autoSlideshow/onboarding';
import { requireSlideshowWorkspace } from '../autoSlideshow/workspaces';
import { domainOf } from '../companyIntel/profile';
import { HttpError } from '../http';
import { isOpenProspect } from '../prospects/openPack';
import { latestForSite } from './siteProfile';
import type { StudioProfileData } from './types';

/** The body's list, cleaned. Throws 400 rather than silently dropping what the person typed. */
export const parseIndustries = (raw: unknown): string[] => {
  if (!Array.isArray(raw) || raw.some((n) => typeof n !== 'string')) throw new HttpError(400, 'invalid_industries', 'Send a list of client types.');
  const industries = cleanIndustries(raw as string[]);
  if (industries.length > MAX_CUSTOMER_INDUSTRIES) throw new HttpError(400, 'too_many_industries', `Pick ${MAX_CUSTOMER_INDUSTRIES} client types at most.`);
  if (industries.some((n) => n.length > MAX_INDUSTRY_CHARS)) throw new HttpError(400, 'industry_too_long', `Keep each client type under ${MAX_INDUSTRY_CHARS} letters.`);
  return industries;
};

/** The profile Blitz reads for this workspace: the newest one of its website, else its newest one with data. */
const profileIdOf = async (workspaceId: string): Promise<string | null> => {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { websiteUrl: true } });
  if (!ws) throw new HttpError(404, 'workspace_not_found', 'Workspace not found.');
  const site = ws.websiteUrl ? await latestForSite(ws.websiteUrl, workspaceId) : null;
  if (site) return site.id;
  const rows = await prisma.studioBrandProfile.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' }, select: { id: true, data: true }, take: 20 });
  return rows.find((r) => Boolean(r.data && typeof r.data === 'object' && 'identity' in r.data))?.id ?? null;
};

const toDto = (data: StudioProfileData | null, askOwner = false): CustomerIndustriesDto => {
  const field = data?.market?.targetCustomerIndustries;
  return { industries: usedIndustries(field), suggestions: suggestedIndustries(field), edited: field?.source === 'manual', ready: data !== null, askOwner };
};

/** The owner is asked once the list is read and nobody checked it. Not on an unclaimed Prospect Pack: it is asked after the claim. */
const shouldAsk = async (workspaceId: string, data: StudioProfileData | null): Promise<boolean> => {
  if (!data || data.market?.targetCustomerIndustries?.source === 'manual') return false;
  const [open, prospect] = await Promise.all([onboardingOpen(workspaceId).catch(() => false), isOpenProspect(workspaceId).catch(() => false)]);
  return !open && !prospect;
};

export const getCustomerIndustries = async (workspaceId: string): Promise<CustomerIndustriesDto> => {
  const id = await profileIdOf(workspaceId);
  const row = id ? await prisma.studioBrandProfile.findUnique({ where: { id }, select: { data: true } }) : null;
  const data = (row?.data as unknown as StudioProfileData | undefined) ?? null;
  return toDto(data, await shouldAsk(workspaceId, data));
};

/** The profile with this list as a hand edit. An item kept from before keeps its website quote; the others stay offered. */
export const withIndustries = (data: StudioProfileData, industries: string[]): StudioProfileData => {
  const field = data.market.targetCustomerIndustries;
  const quotes = new Map((field.value ?? []).map((name, i) => [name.toLowerCase(), field.evidence?.[i] ?? '']));
  const chosen = new Set(industries.map((n) => n.toLowerCase()));
  const alternatives = cleanIndustries([...(field.value ?? []), ...(field.alternatives ?? [])]).filter((n) => !chosen.has(n.toLowerCase()));
  return {
    ...data,
    market: {
      ...data.market,
      targetCustomerIndustries: { ...field, value: industries, evidence: industries.map((n) => quotes.get(n.toLowerCase()) ?? ''), alternatives, source: 'manual', confidence: 1, locked: true },
    },
  };
};

/** The profile with a hand-written Audience: on both fields that hold it, kept by a new extraction. */
export const withAudience = (data: StudioProfileData, audience: string): StudioProfileData => {
  const edited = { source: 'manual' as const, confidence: 1, locked: true, value: audience };
  return {
    ...data,
    market: { ...data.market, audienceDescription: { ...data.market.audienceDescription, ...edited } },
    ...(data.brand ? { brand: { ...data.brand, audience: { ...data.brand.audience, ...edited } } } : {}),
  };
};

const sameList = (a: string[], b: string[]): boolean => a.map((n) => n.toLowerCase()).join('\n') === b.map((n) => n.toLowerCase()).join('\n');

/** Plain sentence used when the model call fails. */
export const audienceFromList = (industries: string[]): string =>
  `Clients in ${industries.length > 1 ? `${industries.slice(0, -1).join(', ')} and ${industries.at(-1)}` : industries[0]}.`;

/** The Audience sentence for a new list: keeps what still holds of the old one, names only these client types. */
const rewriteAudience = async (oldAudience: string, industries: string[], sells: string): Promise<string> => {
  const fallback = audienceFromList(industries);
  try {
    const result = await chatJson<{ audience?: unknown }>(
      [
        {
          role: 'system',
          content: `You rewrite one sentence saying who a business sells to, after the owner changed their client types.
Name these client types and no other. Say who the buyer is in each one and what they want, using what the old sentence says when it still fits. Invent no facts, numbers or places. Max 35 words, plain words.
Return JSON only: { "audience": "..." }`,
        },
        { role: 'user', content: `Business sells: ${sells}\nOld sentence: ${oldAudience}\nNew client types: ${industries.join(', ')}` },
      ],
      { maxTokens: 120, temperature: 0.2, model: 'gpt-4o-mini' },
    );
    return typeof result?.audience === 'string' && result.audience.trim() ? result.audience.trim() : fallback;
  } catch (err) {
    console.warn('[studio/industries] audience rewrite failed:', err instanceof Error ? err.message : err);
    return fallback;
  }
};

/** The site's recent runs show the Audience from their own copy (the brand card; steps not run yet): they get the new one. */
const updateRunCopies = async (workspaceId: string, sourceUrl: string, audience: string) => {
  const runs = await prisma.autoSlideshowRun.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, url: true, profile: true } });
  const site = domainOf(sourceUrl);
  await Promise.all(runs.filter((r) => r.profile && domainOf(r.url) === site).map((r) => prisma.autoSlideshowRun.update({
    where: { id: r.id },
    data: { profile: { ...(r.profile as unknown as BrandProfile), audience } as unknown as Prisma.InputJsonValue },
  })));
};

export type IndustriesEdit = { dto: CustomerIndustriesDto; changed: boolean; workspaceId: string; brandProfileId: string; data: StudioProfileData; sourceUrl: string };

/**
 * Saves the list on the profile (confirming it unchanged counts too). A changed list gets a new Audience. The row is
 * locked for the write, so a keyword refresh saving the same JSON cannot undo it. `userId`: must own the workspace.
 */
export const editCustomerIndustries = async (workspaceId: string, industries: string[], userId: string | null): Promise<IndustriesEdit> => {
  if (userId) await requireSlideshowWorkspace(userId, workspaceId);
  const id = await profileIdOf(workspaceId);
  if (!id) throw new HttpError(409, 'profile_not_ready', 'We are still reading your website. Try again in a minute.');
  const before = await prisma.studioBrandProfile.findUniqueOrThrow({ where: { id }, select: { data: true } });
  const old = before.data as unknown as StudioProfileData;
  const changed = !sameList(usedIndustries(old.market.targetCustomerIndustries), industries);
  const oldAudience = old.brand?.audience.value || old.market.audienceDescription.value;
  const sells = old.brand?.valueProp.value || old.positioning.promoting.value;
  const audience = changed && industries.length > 0 ? await rewriteAudience(oldAudience, industries, sells) : null;

  const saved = await prisma.$transaction(async (tx) => {
    const [row] = await tx.$queryRaw<Array<{ data: StudioProfileData; source_url: string }>>`
      SELECT data, source_url FROM studio_brand_profiles WHERE id = ${id} FOR UPDATE`;
    if (!row) throw new HttpError(404, 'profile_not_found', 'Profile not found.');
    const listed = withIndustries(row.data, industries);
    const data = audience ? withAudience(listed, audience) : listed;
    await tx.studioBrandProfile.update({ where: { id }, data: { data: data as unknown as Prisma.InputJsonValue } });
    return { data, sourceUrl: row.source_url };
  });
  if (audience) await updateRunCopies(workspaceId, saved.sourceUrl, audience);
  return { dto: toDto(saved.data), changed, workspaceId, brandProfileId: id, ...saved };
};
