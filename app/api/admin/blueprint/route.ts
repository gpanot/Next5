/** Admin › Jun Yuh › My Blueprint: the admin's own blueprint (owner null). */
import type { NextRequest } from 'next/server';
import { blueprintPatchSchema } from '../../../../src/lib/blueprint/schema';
import { adminRoute, json } from '../../../../src/server/admin/route';
import { getOrCreateBlueprint, patchBlueprint } from '../../../../src/server/blueprint/blueprints';
import { HttpError, readJsonObject } from '../../../../src/server/http';

/** GET /api/admin/blueprint — the admin blueprint, created on first visit. */
export const GET = adminRoute(async () => json({ blueprint: await getOrCreateBlueprint(null, null) }));

/** PATCH /api/admin/blueprint — { version, topics?, about?, days?: { "0": {...} }, step?, reset? }. 409 on a stale version. */
export const PATCH = adminRoute(async (req: NextRequest) => {
  const parsed = blueprintPatchSchema.safeParse(await readJsonObject(req));
  if (!parsed.success) throw new HttpError(400, 'invalid_body', 'Some fields are too long or not valid.', { issues: parsed.error.issues.slice(0, 5) });
  return json({ blueprint: await patchBlueprint(null, parsed.data) });
});
