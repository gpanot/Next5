'use client';

import type { CreditsDto } from '../../../../../types/admin/slideshowCredits';
import { useAdminApi } from '../../../business/useAdminApi';
import { AutoRechargeCard } from './AutoRechargeCard';
import { BalanceCard } from './BalanceCard';
import { CardsCard } from './CardsCard';
import { Notice } from './fields';
import { HistoryList } from './HistoryList';
import { TopUpCard } from './TopUpCard';
import { useCheckoutReturn } from './useCheckoutReturn';

function CreditsSkeleton() {
  return (
    <div className="space-y-3" aria-busy>
      {['h-28', 'h-48', 'h-24'].map((h) => <div key={h} className={`${h} animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800`} />)}
    </div>
  );
}

/** Settings → Credits: balance, top up by card, auto top up and saved cards. 99¢ per slideshow. */
export function CreditsSection({ token, workspaceId }: { token: string; workspaceId: string }) {
  const { data, error, loading, refresh } = useAdminApi<CreditsDto>(token, '/api/slideshow/credits');
  const returned = useCheckoutReturn(token, refresh);

  if (loading && !data) return <CreditsSkeleton />;
  if (error && !data) return <Notice tone="error">{error}</Notice>;
  if (!data) return null;
  return (
    <section className="space-y-3">
      {returned && <Notice tone={returned.tone}>{returned.text}</Notice>}
      <BalanceCard balanceCents={data.balanceCents} priceCents={data.priceCents} />
      {!data.paymentsReady && <Notice tone="info">Card payments open soon. Nothing can be charged yet.</Notice>}
      <TopUpCard token={token} workspaceId={workspaceId} priceCents={data.priceCents} disabled={!data.paymentsReady} />
      {/* Keyed so a refresh after saving or a card change resets the form to what was saved */}
      <AutoRechargeCard key={JSON.stringify([data.autoRecharge, data.cards.length])} token={token} settings={data.autoRecharge} cards={data.cards} onSaved={refresh} />
      <CardsCard token={token} workspaceId={workspaceId} cards={data.cards} autoCardId={data.autoRecharge.paymentMethodId} disabled={!data.paymentsReady} onChanged={refresh} />
      <HistoryList entries={data.history} />
    </section>
  );
}
