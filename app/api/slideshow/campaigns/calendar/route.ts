/**
 * GET /api/slideshow/campaigns/calendar?workspace= — the workspace's campaign posts for the Calendar: planned ones
 *     (waiting for approval there) and scheduled ones → { slideshows, planned }
 */
import { NextResponse } from 'next/server';
import { requireUser, workspaceParam } from '../../../../../src/server/autoSlideshow/access';
import { campaignCalendar } from '../../../../../src/server/autoSlideshow/campaign/plan';
import { slideshowRoute } from '../../../../../src/server/autoSlideshow/route';

export const GET = slideshowRoute(async (req, _ctx: unknown, access) => NextResponse.json(await campaignCalendar(await workspaceParam(req, requireUser(access)))));
