import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { authedRoute } from '../../../../../src/server/api';
import { HttpError, readJsonObject } from '../../../../../src/server/http';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

const MAX = 80;
const clean = (value: unknown) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, MAX) : '');

/**
 * PUT { agentName, brokerage } — the brokerage disclosure on listing captions, "Listed by {agentName}, {brokerage}"
 * (docs/business-studios/15-realtor-autopilot-plan.md §5.5). Asked once, before her first listing playbook.
 */
export const PUT = authedRoute(async (req, session) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const body = await readJsonObject(req);
  const agentName = clean(body.agentName);
  const brokerage = clean(body.brokerage);
  if (agentName.length < 2 || brokerage.length < 2) throw new HttpError(400, 'invalid_disclosure', 'Add your name and your brokerage.');
  await prisma.workspace.update({ where: { id: ws.id }, data: { agentName, brokerage } });
  return NextResponse.json({ disclosure: { agentName, brokerage } });
});
