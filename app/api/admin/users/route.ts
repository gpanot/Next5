import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../src/lib/admin-auth';
import { prisma } from '../../../../src/lib/db';

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { bookings: true, photos: true } },
      bookings: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true, paymentStatus: true, routeTitle: true },
      },
    },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.createdAt.toISOString(),
      booking_count: u._count.bookings,
      photo_count: u._count.photos,
      last_booking: u.bookings[0]
        ? {
            route_title: u.bookings[0].routeTitle,
            payment_status: u.bookings[0].paymentStatus,
            created_at: u.bookings[0].createdAt.toISOString(),
          }
        : null,
    })),
  });
}
