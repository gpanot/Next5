'use client';

import { Package } from 'lucide-react';
import { AppLink as Link } from '../shell/AppLink';
import { useAppRouter } from '../shell/AppLink';
import { EmptyState } from '../../ui/EmptyState';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { CreditsCard } from './CreditsCard';
import { QuickstartCard } from './QuickstartCard';

const greeting = (): string => {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
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
            <p className="text-[14px] text-app-muted">Add your photos and pick a {product === 'shop' ? 'model' : 'style'} to create your first batch.</p>
          </div>
          <Link href={`/start/${product}`} className="inline-flex h-10 items-center rounded-xl bg-app-cta px-4 text-[14px] font-medium text-app-cta-ink hover:opacity-90">Continue setup</Link>
        </div>
      )}
      {product === 'brand' ? (
        // Quickstart checklist only: the calendar has its own page.
        <QuickstartCard me={me} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <CreditsCard me={me} />
          <EmptyState illustration={<Package className="h-9 w-9" />} title="New stock in?" body="Add products and create on-model photos in one go." action={{ label: 'Add products', onClick: () => router.push('/app/products') }} />
        </div>
      )}
    </>
  );
};
