/** GET /api/admin/slideshow-knowledge/models — every model with its proof (examples, views, saves per 1,000 views) */
import { adminRoute, json } from '../../../../../src/server/admin/route';
import { listModels } from '../../../../../src/server/slideshowKnowledge/store';

export const GET = adminRoute(async () => json({ models: await listModels() }));
