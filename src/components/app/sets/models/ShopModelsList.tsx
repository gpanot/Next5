'use client';

import { Plus, UsersRound } from 'lucide-react';
import { useApi } from '../../../../hooks/useApi';
import type { StudioSetDto } from '../../../../types/business/catalog';
import { EmptyState } from '../../../ui/EmptyState';
import { ErrorState } from '../../../ui/ErrorState';
import { SkeletonGrid } from '../../../ui/Skeleton';
import { AppLink as Link, useAppRouter } from '../../shell/AppLink';
import { useWorkspace } from '../../shell/WorkspaceProvider';
import type { Identity } from '../IdentityPhotoGrid';
import { groupByModel } from './modelIdentity';
import { ShopModelTile } from './ShopModelTile';

const AddModelTile = () => (
  <Link
    href="/app/sets/new"
    className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-app-line bg-app-panel p-6 text-center transition-colors duration-200 hover:border-app-muted hover:bg-app-sunken"
  >
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent"><Plus aria-hidden className="h-5 w-5" /></span>
    <span className="text-[14px] font-semibold text-app-ink">Add a model</span>
    <span className="max-w-[200px] text-[12px] text-app-muted">Pick a Studio model or use your own photos.</span>
  </Link>
);

/** Shop → Studio Models: the models who wear your products. Same grid as Brand influencers. */
export const ShopModelsList = () => {
  const { refresh: refreshMe } = useWorkspace();
  const router = useAppRouter();
  const sets = useApi<{ sets: StudioSetDto[] }>('/api/app/sets?product=shop');
  const identity = useApi<{ identities: Identity[] }>('/api/app/identity?product=shop');

  if (sets.loading && !sets.data) return <SkeletonGrid count={3} cols={3} />;
  if (sets.error && !sets.data) return <ErrorState message={sets.error} onRetry={sets.refresh} />;

  const groups = groupByModel(sets.data?.sets ?? []);
  if (groups.length === 0) {
    return (
      <EmptyState
        illustration={<UsersRound className="h-10 w-10" />}
        title="Add your first model"
        body="Pick a Studio model or use your own photos. You pick the scenes each time you create a drop."
        action={{ label: 'Add a model', iconLeft: <Plus className="h-4 w-4" />, onClick: () => router.push('/app/sets/new') }}
      />
    );
  }

  const photos = identity.data?.identities ?? [];
  const myPhotoUrl = photos.find((p) => p.kind === 'full_body')?.url ?? photos[0]?.url ?? null;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14px] text-app-muted">Add a few models and switch between them. Your shop looks like real creators, not one face.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <ShopModelTile
            key={g.model.ref}
            group={g}
            myPhotoUrl={myPhotoUrl}
            onMyPhotosChanged={() => { identity.refresh(); refreshMe(); }}
          />
        ))}
        <AddModelTile />
      </div>
    </div>
  );
};
