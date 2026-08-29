import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../src/lib/admin-auth';
import { prisma } from '../../../../src/lib/db';

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { email: true } },
      _count: { select: { photos: true } },
      photos: {
        where: { type: { in: ['preview', 'generated'] } },
        select: { id: true, type: true, sceneIndex: true, wavespeedUrl: true, r2Key: true, isStored: true },
        orderBy: [{ type: 'asc' }, { sceneIndex: 'asc' }],
      },
    },
  });

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      route_id: b.routeId,
      route_title: b.routeTitle,
      director_name: b.directorName,
      feelings: b.feelings,
      goals: b.goals,
      amount_vnd: b.amountVnd,
      discount_percent: b.discountPercent,
      payment_status: b.paymentStatus,
      shoot_status: b.shootStatus,
      photo_count: b._count.photos,
      created_at: b.createdAt.toISOString(),
      user_email: b.user?.email ?? null,
      photos: b.photos.map((p) => ({
        id: p.id,
        type: p.type,
        scene_index: p.sceneIndex,
        url: p.wavespeedUrl,
        r2_key: p.r2Key,
        is_stored: p.isStored,
      })),
    })),
  });
}
