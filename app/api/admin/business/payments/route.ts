import { prisma } from '../../../../../src/lib/db';
import { adminRoute, json } from '../../../../../src/server/admin/route';
import { describePaymentItem } from '../../../../../src/server/payments/payments';

/** GET ?state= — latest 200 payments. */
export const GET = adminRoute(async (req) => {
  const state = req.nextUrl.searchParams.get('state');
  const rows = await prisma.payment.findMany({
    where: state && ['pending', 'paid', 'underpaid', 'expired', 'refunded'].includes(state) ? { state: state as 'pending' } : {},
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return json({
    payments: rows.map((p) => ({
      id: p.id, email: p.user.email, item: describePaymentItem(p), state: p.state, provider: p.provider, reference: p.reference,
      amountUsdCents: p.amountUsdCents, amountVnd: p.amountVnd, paidVnd: p.paidVnd, createdAt: p.createdAt.toISOString(), paidAt: p.paidAt?.toISOString() ?? null,
    })),
  });
});
