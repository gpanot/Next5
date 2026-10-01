/** GET /api/admin/auto-slideshow/music — background tracks from the Assets Library (type AUDIO), by name */
import { json } from '../../../../../src/server/admin/route';
import { listTracks } from '../../../../../src/server/autoSlideshow/music';
import { slideshowRoute } from '../../../../../src/server/autoSlideshow/route';

export const GET = slideshowRoute(async () => json({ tracks: await listTracks() }));
