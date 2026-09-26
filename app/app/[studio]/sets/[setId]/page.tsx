'use client';

import { use, useState } from 'react';
import { SetEditor } from '../../../../../src/components/app/sets/SetEditor';
import { ShopModelEditor } from '../../../../../src/components/app/sets/models/ShopModelEditor';
import { useWorkspace } from '../../../../../src/components/app/shell/WorkspaceProvider';
import { useAppRouter } from '../../../../../src/components/app/shell/AppLink';
import { AppPage } from '../../../../../src/components/app/shell/AppShell';
import { AppButton } from '../../../../../src/components/ui/AppButton';
import { ErrorState } from '../../../../../src/components/ui/ErrorState';
import { SkeletonCard } from '../../../../../src/components/ui/Skeleton';
import { useApi } from '../../../../../src/hooks/useApi';
import { apiFetch } from '../../../../../src/lib/apiClient';
import type { StudioSetDto } from '../../../../../src/types/business/catalog';

export default function SetDetailPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = use(params);
  const router = useAppRouter();
  const { product } = useWorkspace();
  const isShop = product === 'shop';
  const { data, error, loading, refresh } = useApi<{ set: StudioSetDto }>(`/api/app/sets/${setId}`);
  const [archiving, setArchiving] = useState(false);

  const archive = async () => {
    if (!window.confirm('Archive this style? Your photos stay in the library.')) return;
    setArchiving(true);
    await apiFetch(`/api/app/sets/${setId}`, { method: 'DELETE' }).catch(() => undefined);
    router.push('/app/sets');
  };

  return (
    // Shop archives from the editor's own button, so the header stays clean.
    <AppPage title={data?.set.name ?? (isShop ? 'Model' : 'Style')} actions={data && !isShop ? <AppButton size="sm" variant="ghost" loading={archiving} onClick={archive}>Archive</AppButton> : undefined}>
      {loading && <SkeletonCard />}
      {error && <ErrorState message={error} onRetry={refresh} />}
      {data && (isShop ? <ShopModelEditor key={data.set.id} existing={data.set} /> : <SetEditor key={data.set.id} existing={data.set} />)}
    </AppPage>
  );
}
