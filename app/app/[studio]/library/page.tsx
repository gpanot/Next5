'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { LibraryView } from '../../../../src/components/app/library/LibraryView';
import { useAppRouter } from '../../../../src/components/app/shell/AppLink';
import { AppPage } from '../../../../src/components/app/shell/AppShell';
import { useWorkspace } from '../../../../src/components/app/shell/WorkspaceProvider';
import { TikTokLibraryView } from '../../../../src/components/app/tiktokLibrary/TikTokLibraryView';
import { SkeletonText } from '../../../../src/components/ui/Skeleton';

/** Realtors: the Library is a tab of Listings now; old links keep their params (e.g. ?view=videos). */
const BrandLibraryRedirect = () => {
  const router = useAppRouter();
  const params = useSearchParams();
  useEffect(() => {
    const next = new URLSearchParams(params.toString());
    next.set('tab', 'library');
    router.replace(`/app/create?${next.toString()}`);
  }, [router, params]);
  return <AppPage title="Listings"><SkeletonText lines={3} /></AppPage>;
};

export default function LibraryPage() {
  const { product } = useWorkspace();
  if (product === 'brand') return <BrandLibraryRedirect />;
  return product === 'shop'
    ? <AppPage title="TikTok library"><TikTokLibraryView /></AppPage>
    : <AppPage title="Library"><LibraryView /></AppPage>;
}
