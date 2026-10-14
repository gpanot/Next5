/**
 * GET  /api/admin/hook-knowledge — { entries: HookKnowledgeDto[] }, newest first.
 * POST /api/admin/hook-knowledge — { title, body, fileName? } → { entry }.
 */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../src/server/admin/route';
import { createKnowledge, listKnowledge, parseKnowledge } from '../../../../src/server/hookKnowledge/store';

export const GET = adminRoute(async () => json({ entries: await listKnowledge() }));

export const POST = adminRoute(async (req: NextRequest) => json({ entry: await createKnowledge(parseKnowledge(await req.json().catch(() => ({})))) }));
