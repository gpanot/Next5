import { NextResponse } from 'next/server';
import { prisma } from '../../../../src/lib/db';
import { adminRoute } from '../../../../src/server/admin/route';
import { HttpError, readJsonObject } from '../../../../src/server/http';
import { createTemplate, parseTemplateInput } from '../../../../src/server/templates/crud';
import { listTemplates } from '../../../../src/server/templates/repository';

/**
 * GET /api/admin/content-templates — the template library.
 * `?workspaceId=` adds that workspace's overrides, `?status=` narrows by status.
 */
export const GET = adminRoute(async (req: Request) => {
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  if (status && !['draft', 'active', 'archived'].includes(status)) {
    throw new HttpError(400, 'invalid_status', 'Unknown status.');
  }
  const templates = await listTemplates({
    workspaceId: url.searchParams.get('workspaceId'),
    status: (status ?? undefined) as 'draft' | 'active' | 'archived' | undefined,
  });
  return NextResponse.json({ templates });
});

/** POST /api/admin/content-templates — create a template with its first version. */
export const POST = adminRoute(async (req: Request) => {
  const input = parseTemplateInput(await readJsonObject(req));
  const template = await createTemplate(prisma, input);
  return NextResponse.json({ template }, { status: 201 });
});
