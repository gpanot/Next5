// server-only — never import from a 'use client' file.

import type { SocialConnection } from '@prisma/client';
import { prisma } from '../../lib/db';
import { markPosted } from '../calendar/calendar';
import type { ConnectionDto } from '../../types/business/integrations';
import { HttpError } from '../http';
import { decryptToken, encryptToken } from './crypto';
import { instagram } from './instagram';
import { mediaUrlFor } from './links';
import { tiktok } from './tiktok';
import type { ProviderClient, ProviderTokens, SocialProvider } from './types';

export const PROVIDERS: Record<SocialProvider, ProviderClient> = { instagram, tiktok };

const LABEL: Record<SocialProvider, string> = { instagram: 'Instagram', tiktok: 'TikTok' };

export const listConnections = async (workspaceId: string): Promise<ConnectionDto[]> => {
  const rows = await prisma.socialConnection.findMany({ where: { workspaceId }, orderBy: { createdAt: 'asc' } });
  return rows.map((r) => ({ provider: r.provider as SocialProvider, username: r.username, avatarUrl: r.avatarUrl, connectedAt: r.createdAt.toISOString() }));
};

/** One account per platform per workspace: connecting again replaces the old one. */
export const saveConnection = async (workspaceId: string, provider: SocialProvider, t: ProviderTokens): Promise<void> => {
  const data = {
    externalId: t.externalId,
    username: t.username,
    avatarUrl: t.avatarUrl,
    accessToken: encryptToken(t.accessToken),
    refreshToken: t.refreshToken ? encryptToken(t.refreshToken) : null,
    expiresAt: t.expiresAt,
    refreshExpiresAt: t.refreshExpiresAt,
    scopes: t.scopes,
  };
  await prisma.socialConnection.upsert({ where: { workspaceId_provider: { workspaceId, provider } }, create: { workspaceId, provider, ...data }, update: data });
};

export const disconnect = async (workspaceId: string, provider: SocialProvider): Promise<void> => {
  await prisma.socialConnection.deleteMany({ where: { workspaceId, provider } });
};

const reconnect = (provider: SocialProvider) =>
  new HttpError(409, 'reconnect_required', `Your ${LABEL[provider]} connection expired. Connect it again in Settings.`);

/** Refreshes the token when it is close to expiring (TikTok: 24 h tokens; Instagram: 60 days). */
const freshAccessToken = async (conn: SocialConnection): Promise<string> => {
  const provider = conn.provider as SocialProvider;
  const accessToken = decryptToken(conn.accessToken);
  const margin = provider === 'tiktok' ? 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  if (!conn.expiresAt || conn.expiresAt.getTime() - Date.now() > margin) return accessToken;
  if (conn.expiresAt.getTime() <= Date.now() && provider === 'instagram') throw reconnect(provider);
  // Instagram only refreshes tokens that are at least 24 hours old.
  if (provider === 'instagram' && Date.now() - conn.updatedAt.getTime() < 24 * 60 * 60 * 1000) return accessToken;
  const refreshed = await PROVIDERS[provider]
    .refresh({ accessToken, refreshToken: conn.refreshToken ? decryptToken(conn.refreshToken) : null })
    .catch(() => null);
  if (!refreshed) throw reconnect(provider);
  await prisma.socialConnection.update({
    where: { id: conn.id },
    data: {
      accessToken: encryptToken(refreshed.accessToken),
      refreshToken: refreshed.refreshToken ? encryptToken(refreshed.refreshToken) : conn.refreshToken,
      expiresAt: refreshed.expiresAt,
      refreshExpiresAt: refreshed.refreshExpiresAt ?? conn.refreshExpiresAt,
    },
  });
  return refreshed.accessToken;
};

type Kit = { hook?: string; caption?: string; hashtags?: string[] } | null;

/** Caption as she would paste it: her own edit, or hook + caption + hashtags from the Post Kit. */
const captionFor = (override: string | null, kit: Kit): string =>
  override?.trim() || [kit?.hook, kit?.caption, kit?.hashtags?.length ? kit.hashtags.join(' ') : null].filter(Boolean).join('\n\n');

/** "Post now" from the calendar: sends the photo and caption, logs it, and marks the day as posted. */
export const publishSlot = async (workspaceId: string, slotId: string, provider: SocialProvider): Promise<void> => {
  const slot = await prisma.postSlot.findFirst({ where: { id: slotId, workspaceId }, include: { item: { select: { id: true, r2Key: true, postKit: true, batch: { select: { name: true } } } } } });
  if (!slot?.item?.r2Key) throw new HttpError(404, 'slot_not_found', 'This post has no photo yet.');
  const conn = await prisma.socialConnection.findUnique({ where: { workspaceId_provider: { workspaceId, provider } } });
  if (!conn) throw new HttpError(409, 'not_connected', `Connect ${LABEL[provider]} in Settings first.`);

  const kit = slot.item.postKit as Kit;
  try {
    const result = await PROVIDERS[provider].publishPhoto({
      accessToken: await freshAccessToken(conn),
      externalId: conn.externalId,
      imageUrl: mediaUrlFor(slot.item.id),
      title: kit?.hook ?? slot.item.batch.name,
      caption: captionFor(slot.captionOverride, kit),
    });
    await prisma.socialPost.create({ data: { workspaceId, slotId, provider, status: 'sent', externalId: result.externalId, postUrl: result.postUrl } });
    await markPosted(workspaceId, slotId, result.postUrl);
  } catch (err) {
    await prisma.socialPost.create({ data: { workspaceId, slotId, provider, status: 'failed', error: err instanceof Error ? err.message.slice(0, 500) : 'unknown' } });
    throw err;
  }
};
