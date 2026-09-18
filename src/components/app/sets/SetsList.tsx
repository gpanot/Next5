'use client';

import { Archive, Layers, Plus } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';
import { AppLink as Link } from '../shell/AppLink';
import { useAppRouter } from '../shell/AppLink';
import { useApi } from '../../../hooks/useApi';
import { hasManifestImage } from '../../../lib/manifest';
import type { StudioSetDto } from '../../../types/business/catalog';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonGrid } from '../../ui/Skeleton';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { ArchiveSetDialog } from './ArchiveSetDialog';
import { IdentityPhotosCard } from './IdentityPhotosCard';

export const SetsList = () => {
  const { me, product } = useWorkspace();
  const router = useAppRouter();
  const { data, error, loading, refresh } = useApi<{ sets: StudioSetDto[] }>(product ? `/api/app/sets?product=${product}` : null);
  const [archiving, setArchiving] = useState<StudioSetDto | null>(null);
  const noun = product === 'shop' ? 'shop look' : 'style';
  if (loading) return <SkeletonGrid count={3} cols={3} />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  const sets = data?.sets ?? [];
  const atLimit = sets.length >= (me?.plan?.maxSets ?? 1);

  if (sets.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {product && <IdentityPhotosCard product={product} />}
        <EmptyState illustration={<Layers className="h-10 w-10" />} title={`No ${noun}s yet`} body={`A ${noun} keeps every batch in the same look.`} action={{ label: `Create a ${noun}`, onClick: () => router.push('/app/sets/new') }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
    {product && <IdentityPhotosCard product={product} />}
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      {sets.map((set) => {
        const cover = hasManifestImage(set.coverImage) ? set.coverImage : null;
        return (
          <div key={set.id} className="relative">
          <button type="button" onClick={() => setArchiving(set)} aria-label={`Archive ${set.name}`} title="Archive" className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors duration-200 hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"><Archive aria-hidden className="h-4 w-4" /></button>
          <Link href={`/app/sets/${set.id}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-app-line bg-app-panel shadow-sm transition-shadow duration-200 hover:shadow-md">
            <div className="relative aspect-[4/5] bg-app-sunken">
              {cover && <Image src={cover} alt={set.name} fill sizes="(min-width: 1024px) 30vw, 45vw" className="object-cover" />}
            </div>
            <div className="flex flex-col gap-0.5 p-4">
              <span className="text-[15px] font-semibold text-app-ink">{set.name}</span>
              <span className="text-[13px] text-app-muted">{set.templateName}{set.locations.length ? ` · ${set.locations.length} location${set.locations.length > 1 ? 's' : ''}` : ''}</span>
              <span className="text-[12px] text-app-muted">Used in {set.batchCount} batch{set.batchCount === 1 ? '' : 'es'}</span>
            </div>
          </Link>
          </div>
        );
      })}
      <Link href={atLimit ? '/app/billing' : '/app/sets/new'} className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-app-line p-6 text-center transition-colors duration-200 hover:border-app-accent">
        <Plus aria-hidden className="h-6 w-6 text-app-accent" />
        <span className="text-[14px] font-semibold text-app-ink">{atLimit ? `Upgrade for more ${noun}s` : `New ${noun}`}</span>
        <span className="text-[12px] text-app-muted">{sets.length} of {me?.plan?.maxSets ?? 1} used{atLimit ? ' · archive one to free a place' : ''}</span>
      </Link>
    </div>
    {archiving && <ArchiveSetDialog setId={archiving.id} name={archiving.name} noun={noun} onClose={() => setArchiving(null)} onArchived={() => { setArchiving(null); refresh(); }} />}
    </div>
  );
};
