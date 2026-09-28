'use client';

import { useCallback } from 'react';
import { adminTokenStore, useAdminToken } from '../../../src/lib/adminToken';
import { AdminLogin } from '../../../src/components/admin/AdminLogin';
import { MetaAdsTab } from '../../../src/components/admin/metaAds/MetaAdsTab';
import { SiteTopBar } from '../../../src/components/admin/metaAds/SiteTopBar';

/** Perfect Ads as a standalone page — same MetaAdsTab as the admin tab, no admin chrome. */
export default function PerfectAdsPage() {
  const token = useAdminToken();
  const handleToken = useCallback((t: string) => adminTokenStore.set(t), []);

  if (token === undefined) return null;
  if (!token) return <AdminLogin onToken={handleToken} />;

  return (
    <main className="min-h-dvh bg-white px-4 py-4 md:px-8 md:py-8 dark:bg-zinc-950">
      {/* Negative margins let the top bar span the full width past main's padding */}
      <MetaAdsTab token={token} header={<div className="sticky top-0 z-30 -mx-4 -mt-4 mb-4 md:-mx-8 md:-mt-8 md:mb-8"><SiteTopBar /></div>} />
    </main>
  );
}
