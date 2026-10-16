import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../src/lib/admin-auth';
import { prisma } from '../../../../src/lib/db';
import { emailKind } from '../../../../src/lib/emailDomain';

type CreditTotals = { balanceCents: number | null; usedCents: number; purchasedCents: number; givenCents: number };

/** Each user's Auto Slideshow credits from the ledger: used = charges net of refunds, purchased = card top ups,
 *  given = the free grant plus admin adjustments. Balance null = no wallet yet. */
const creditTotals = async (): Promise<Map<string, CreditTotals>> => {
  const [wallets, sums] = await Promise.all([
    prisma.slideshowWallet.findMany({ select: { userId: true, balanceCents: true } }),
    prisma.slideshowCreditEntry.groupBy({ by: ['userId', 'reason'], _sum: { deltaCents: true } }),
  ]);
  const totals = new Map<string, CreditTotals>();
  const of = (userId: string) => {
    let t = totals.get(userId);
    if (!t) totals.set(userId, (t = { balanceCents: null, usedCents: 0, purchasedCents: 0, givenCents: 0 }));
    return t;
  };
  for (const w of wallets) of(w.userId).balanceCents = w.balanceCents;
  for (const row of sums) {
    const t = of(row.userId);
    const cents = row._sum.deltaCents ?? 0;
    if (row.reason === 'slideshow_charge' || row.reason === 'slideshow_refund') t.usedCents -= cents;
    else if (row.reason === 'topup' || row.reason === 'auto_recharge') t.purchasedCents += cents;
    else t.givenCents += cents;
  }
  return totals;
};

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const [users, credits] = await Promise.all([prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { bookings: true, photos: true } },
      bookings: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true, paymentStatus: true, routeTitle: true },
      },
      workspaces: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, product: true, websiteUrl: true, deletedAt: true, createdAt: true },
      },
    },
  }), creditTotals()]);

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      display_name: u.displayName,
      email_kind: emailKind(u.email),
      credits: credits.get(u.id) ?? { balanceCents: null, usedCents: 0, purchasedCents: 0, givenCents: 0 },
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
      workspaces: u.workspaces.map((w) => ({
        id: w.id,
        name: w.name,
        product: w.product,
        websiteUrl: w.websiteUrl,
        deleted: Boolean(w.deletedAt),
        createdAt: w.createdAt.toISOString(),
      })),
    })),
  });
}
