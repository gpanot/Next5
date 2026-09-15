'use client';

import { use, useState } from 'react';
import { SetEditor } from '../../../../../src/components/app/sets/SetEditor';
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
  const { data, error, loading, refresh } = useApi<{ set: StudioSetDto }>(`/api/app/sets/${setId}`);
  const [archiving, setArchiving] = useState(false);

  const archive = async () => {
    if (!window.confirm('Archive this set? Your photos stay in the library.')) return;
    setArchiving(true);
    await apiFetch(`/api/app/sets/${setId}`, { method: 'DELETE' }).catch(() => undefined);
    router.push('/app/sets');
  };

  return (
    <AppPage title={data?.set.name ?? 'Set'} actions={data ? <AppButton size="sm" variant="ghost" loading={archiving} onClick={archive}>Archive</AppButton> : undefined}>
      {loading && <SkeletonCard />}
      {error && <ErrorState message={error} onRetry={refresh} />}
      {data && <SetEditor key={data.set.id} existing={data.set} />}
    </AppPage>
  );
}
