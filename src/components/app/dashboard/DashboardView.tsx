'use client';

import { ImagePlus, Package } from 'lucide-react';
import { AppLink as Link } from '../shell/AppLink';
import { useAppRouter } from '../shell/AppLink';
import { useApi } from '../../../hooks/useApi';
import type { BatchSummaryDto } from '../../../types/business/batches';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonGrid } from '../../ui/Skeleton';
import { BatchCard } from '../batches/BatchCard';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { CreditsCard } from './CreditsCard';
import { FeaturedThemeCard } from './FeaturedThemeCard';
import { TodaysPostCard } from './TodaysPostCard';

const greeting = (): string => {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
};

const RecentBatches = ({ product }: { product: 'brand' | 'shop' }) => {
  const { data, error, loading, refresh } = useApi<{ batches: BatchSummaryDto[] }>(`/api/app/batches?product=${product}&limit=6`);
  if (loading) return <SkeletonGrid count={3} cols={3} />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (!data?.batches.length) {
    return (
      <EmptyState
        illustration={<ImagePlus className="h-10 w-10" />}
        title="No photos yet"
        body="Create your first batch — it takes about 5 minutes."
      />
    );
  }
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.batches.map((b) => <BatchCard key={b.id} batch={b} />)}</div>;
};

export const DashboardView = () => {
  const { me, product } = useWorkspace();
  const router = useAppRouter();
  if (!me?.workspace || !product) return null;
  const setupIncomplete = !me.workspace.onboardingCompleted && (!me.workspace.hasIdentity || me.workspace.setCount === 0);

  return (
    <>
      <p className="text-[15px] text-app-muted">{greeting()}{me.user.displayName ? `, ${me.user.displayName}` : ''}.</p>
      {setupIncomplete && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-app-accent/40 bg-app-accent-soft p-5">
          <div>
            <p className="text-[16px] font-semibold text-app-ink">Finish setting up your studio</p>
            <p className="text-[14px] text-app-muted">Add your photos and pick a {product === 'shop' ? 'shop look' : 'style'} to create your first batch.</p>
          </div>
          <Link href={`/start/${product}`} className="inline-flex h-10 items-center rounded-xl bg-app-accent px-4 text-[14px] font-medium text-app-accent-ink hover:opacity-90">Continue setup</Link>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <CreditsCard me={me} />
        {product === 'brand' ? (
          <TodaysPostCard />
        ) : (
          <EmptyState illustration={<Package className="h-9 w-9" />} title="New stock in?" body="Add products and create on-model photos in one go." action={{ label: 'Add products', onClick: () => router.push('/app/products') }} />
        )}
      </div>
      {product === 'brand' && <FeaturedThemeCard />}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-app-ink">Recent batches</h2>
          <Link href="/app/library" className="text-[14px] text-app-accent hover:text-app-ink">View library</Link>
        </div>
        <RecentBatches product={product} />
      </section>
    </>
  );
};
