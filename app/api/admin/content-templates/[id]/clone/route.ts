import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/lib/db';
import { adminRoute, audit } from '../../../../../../src/server/admin/route';
import { HttpError, readJsonObject } from '../../../../../../src/server/http';
import { cloneAsOverride, duplicateTemplate } from '../../../../../../src/server/templates/crud';

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/content-templates/[id]/clone
 *   { workspaceId } — clone into a workspace-specific override
 *   { slug, name? } — duplicate as another global template
 */
export const POST = adminRoute(async (req, { params }: Ctx) => {
  const { id } = await params;
  const body = await readJsonObject(req);

  if (typeof body.workspaceId === 'string' && body.workspaceId) {
    const template = await cloneAsOverride(prisma, id, body.workspaceId);
    await audit('content_template.override', 'content_template', template.id, { parentId: id });
    return NextResponse.json({ template }, { status: 201 });
  }
  if (typeof body.slug === 'string' && body.slug) {
    const template = await duplicateTemplate(prisma, id, body.slug, typeof body.name === 'string' ? body.name : undefined);
    await audit('content_template.duplicate', 'content_template', template.id, { sourceId: id });
    return NextResponse.json({ template }, { status: 201 });
  }
  throw new HttpError(400, 'invalid_field', 'Pass workspaceId to override, or slug to duplicate.');
});
