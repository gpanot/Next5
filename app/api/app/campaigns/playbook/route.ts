import { NextResponse } from 'next/server';
import { isPlaybookId } from '../../../../../src/lib/realtorPlaybooks';
import { authedRoute } from '../../../../../src/server/api';
import { createPlaybookCampaign, type EventInput } from '../../../../../src/server/campaigns/playbook';
import { HttpError, readJsonObject } from '../../../../../src/server/http';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const eventOf = (raw: unknown): EventInput | null => {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (typeof e.start !== 'string') return null;
  return { start: e.start, end: typeof e.end === 'string' ? e.end : null, source: e.source === 'zillow' ? 'zillow' : 'typed' };
};

/**
 * POST /api/app/campaigns/playbook { playbook, listingId, startDate, channels, event?, newPriceUsd?, oldPriceUsd? } — a realtor playbook and its plan,
 * placed on her free days. Costs nothing; nothing is made until she approves.
 */
export const POST = authedRoute(async (req, session) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const body = await readJsonObject(req);
  if (!isPlaybookId(body.playbook)) throw new HttpError(400, 'invalid_playbook', 'Pick what is happening.');
  const today = new Date().toISOString().slice(0, 10);
  const startDate = typeof body.startDate === 'string' && ISO_DATE.test(body.startDate) && body.startDate >= today ? body.startDate : today;
  const campaign = await createPlaybookCampaign(ws, {
    playbook: body.playbook,
    listingId: typeof body.listingId === 'string' && body.listingId ? body.listingId : null,
    startDate,
    channels: Array.isArray(body.channels) ? body.channels.map(String) : ['instagram', 'tiktok'],
    event: eventOf(body.event),
    newPriceUsd: typeof body.newPriceUsd === 'number' ? body.newPriceUsd : null,
    oldPriceUsd: typeof body.oldPriceUsd === 'number' ? body.oldPriceUsd : null,
  });
  return NextResponse.json({ campaign }, { status: 201 });
});
