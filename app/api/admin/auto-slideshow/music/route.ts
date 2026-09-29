/** GET /api/admin/auto-slideshow/music — background tracks from the Assets Library (type AUDIO), by name */
import { adminRoute, json } from '../../../../../src/server/admin/route';
import { listTracks } from '../../../../../src/server/autoSlideshow/music';

export const GET = adminRoute(async () => json({ tracks: await listTracks() }));
