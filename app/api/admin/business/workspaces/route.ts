import { PLANS, isPlanId } from '../../../../../src/config/plans';
import { prisma } from '../../../../../src/lib/db';
import { adminRoute, json } from '../../../../../src/server/admin/route';
import { getBalance } from '../../../../../src/server/credits/ledger';

/** GET ?search= — newest workspaces with owner, plan and balance. */
export const GET = adminRoute(async (req) => {
  const search = req.nextUrl.searchParams.get('search')?.trim();
  const now = new Date();
  const rows = await prisma.workspace.findMany({
    where: search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { owner: { email: { contains: search, mode: 'insensitive' } } }] } : {},
    include: { owner: { select: { email: true } }, subscriptions: { where: { status: 'active', endsAt: { gt: now } }, orderBy: { endsAt: 'desc' }, take: 1 }, _count: { select: { batches: true, products: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const workspaces = await Promise.all(rows.map(async (w) => {
    const sub = w.subscriptions[0];
    return {
      id: w.id, name: w.name, product: w.product, email: w.owner.email, createdAt: w.createdAt.toISOString(),
      onboardingStep: w.onboardingStep, onboardingCompleted: Boolean(w.onboardingCompletedAt), trialUsed: Boolean(w.trialUsedAt),
      plan: sub && isPlanId(sub.planId) ? `${PLANS[sub.planId].name} · ends ${sub.endsAt?.toISOString().slice(0, 10)}` : null,
      balance: (await getBalance(w.id, now)).total, batches: w._count.batches, products: w._count.products,
    };
  }));
  return json({ workspaces });
});
