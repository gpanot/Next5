import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { adminRoute, audit } from '../../../../../src/server/admin/route';
import { readJsonObject } from '../../../../../src/server/http';
import { archiveTemplate, parseTemplateInput, updateTemplate } from '../../../../../src/server/templates/crud';
import { getTemplateById } from '../../../../../src/server/templates/repository';
import { HttpError } from '../../../../../src/server/http';

type Ctx = { params: Promise<{ id: string }> };
type Purpose = 'awareness' | 'trust' | 'enquiry' | 'conversion' | 'engagement' | 'retention';

/** GET /api/admin/content-templates/[id] */
export const GET = adminRoute(async (_req, { params }: Ctx) => {
  const { id } = await params;
  const template = await getTemplateById(id);
  if (!template) throw new HttpError(404, 'not_found', 'Template not found.');
  return NextResponse.json({ template });
});

/**
 * PATCH /api/admin/content-templates/[id]
 * Sending `version` writes a new version rather than editing the current one in place.
 */
export const PATCH = adminRoute(async (req, { params }: Ctx) => {
  const { id } = await params;
  const body = await readJsonObject(req);
  // A patch carries only what changed, so the full-payload parser is used only when a version is sent.
  const patch = body.version ? parseTemplateInput({ ...body, slug: body.slug ?? 'unused' }) : undefined;
  const template = await updateTemplate(prisma, id, {
    ...(body.name ? { name: String(body.name) } : {}),
    ...(body.status ? { status: String(body.status) as 'draft' | 'active' | 'archived' } : {}),
    ...(body.audience ? { audience: String(body.audience) as 'b2c' | 'b2b' | 'both' } : {}),
    ...(Array.isArray(body.platforms) ? { platforms: body.platforms.map(String) } : {}),
    ...(body.pillarSlug ? { pillarSlug: String(body.pillarSlug) } : {}),
    ...(body.formatSlug ? { formatSlug: String(body.formatSlug) } : {}),
    ...(Array.isArray(body.purposes) ? { purposes: body.purposes.map(String) as Purpose[] } : {}),
    ...(body.primaryPurpose ? { primaryPurpose: String(body.primaryPurpose) as Purpose } : {}),
    ...(patch ? { version: patch.version } : {}),
  });
  await audit('content_template.update', 'content_template', id, { version: template.version });
  return NextResponse.json({ template });
});

/** DELETE /api/admin/content-templates/[id] — archive, never a hard delete. */
export const DELETE = adminRoute(async (_req, { params }: Ctx) => {
  const { id } = await params;
  const template = await archiveTemplate(prisma, id);
  await audit('content_template.archive', 'content_template', id);
  return NextResponse.json({ template });
});
