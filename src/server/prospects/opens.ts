// server-only — never import from a 'use client' file.
// Tracks each time a lead opens a Prospect Pack's link. The page reports the open itself after it has been on screen
// (useProspectOpen), so email scanners and link previews that only fetch the URL never count.

import { prisma } from '../../lib/db';
import type { ProspectOpen } from '../../types/admin/prospects';

export type PackOpens = { count: number; latest: ProspectOpen[] };

export const NO_OPENS: PackOpens = { count: 0, latest: [] };

/** Opens listed per pack on the admin row. */
const LATEST_OPENS = 20;

/** Scanners and crawlers that do run the page's script say so in their user agent. */
const BOT_AGENT = /bot|crawl|spider|slurp|preview|headless|scan|lighthouse|facebookexternalhit|proofpoint|barracuda|mimecast|python|curl|wget/i;

export const isBotAgent = (userAgent: string): boolean => !userAgent.trim() || BOT_AGENT.test(userAgent);

const deviceOf = (userAgent: string): ProspectOpen['device'] => (/mobi|android|iphone|ipad/i.test(userAgent) ? 'mobile' : 'desktop');

/** Saves one open. Does nothing for a bot, a wrong token or a link that is not live. */
export const recordProspectOpen = async (token: string, userAgent: string, country: string | null): Promise<boolean> => {
  if (isBotAgent(userAgent)) return false;
  const pack = await prisma.prospectPack.findUnique({ where: { shareToken: token }, select: { id: true, status: true } });
  if (!pack || (pack.status !== 'ready' && pack.status !== 'claimed')) return false;
  await prisma.prospectPackOpen.create({ data: { packId: pack.id, device: deviceOf(userAgent), country } });
  return true;
};

/** Each pack's open count and latest opens, by pack id. */
export const opensOf = async (packIds: string[]): Promise<Map<string, PackOpens>> => {
  const rows = await prisma.prospectPackOpen.findMany({ where: { packId: { in: packIds } }, orderBy: { openedAt: 'desc' } });
  const opens = new Map<string, PackOpens>();
  for (const row of rows) {
    const entry = opens.get(row.packId) ?? { count: 0, latest: [] };
    entry.count += 1;
    if (entry.latest.length < LATEST_OPENS) entry.latest.push({ at: row.openedAt.toISOString(), device: row.device as ProspectOpen['device'], country: row.country });
    opens.set(row.packId, entry);
  }
  return opens;
};
