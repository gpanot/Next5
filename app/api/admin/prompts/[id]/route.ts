import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../src/lib/admin-auth';
import { prisma } from '../../../../../src/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  const { prompt, is_active } = (await req.json()) as { prompt?: string; is_active?: boolean };

  if (prompt !== undefined && prompt.trim().length === 0) {
    return NextResponse.json({ error: 'Prompt cannot be empty' }, { status: 400 });
  }

  const updated = await prisma.prompt.update({
    where: { id },
    data: {
      ...(prompt !== undefined ? { prompt: prompt.trim() } : {}),
      ...(is_active !== undefined ? { isActive: is_active } : {}),
    },
  });

  return NextResponse.json({
    id: updated.id,
    route_id: updated.routeId,
    scene_index: updated.sceneIndex,
    prompt: updated.prompt,
    is_active: updated.isActive,
    updated_at: updated.updatedAt.toISOString(),
  });
}
