/** GET /api/admin/shorts/workspaces — workspaces with a brand profile and a Slideshow Bank (a short can be made for them). */
import { adminRoute, json } from '../../../../../src/server/admin/route';
import { listShortWorkspaces } from '../../../../../src/server/shorts/brand';

export const GET = adminRoute(async () => json({ workspaces: await listShortWorkspaces() }));
