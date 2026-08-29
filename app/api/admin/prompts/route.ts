import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../src/lib/admin-auth';
import { prisma } from '../../../../src/lib/db';

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const prompts = await prisma.prompt.findMany({
    orderBy: [{ routeId: 'asc' }, { sceneIndex: 'asc' }],
  });

  return NextResponse.json({
    prompts: prompts.map((p) => ({
      id: p.id,
      route_id: p.routeId,
      scene_index: p.sceneIndex,
      prompt: p.prompt,
      is_active: p.isActive,
      updated_at: p.updatedAt.toISOString(),
    })),
  });
}
