'use client';

import { useCallback } from 'react';
import { adminTokenStore, useAdminToken } from '../../../src/lib/adminToken';
import { AdminLogin } from '../../../src/components/admin/AdminLogin';
import { AppTopBar } from '../../../src/components/admin/autoSlideshow/AppTopBar';
import { AutoSlideshowTab } from '../../../src/components/admin/autoSlideshow/AutoSlideshowTab';

/** Auto Slideshow as a standalone page — same tab as in the admin, under the app's own top bar (for demos). */
export default function AutoSlideshowPage() {
  const token = useAdminToken();
  const handleToken = useCallback((t: string) => adminTokenStore.set(t), []);

  if (token === undefined) return null;
  if (!token) return <AdminLogin onToken={handleToken} />;

  return (
    <div className="min-h-dvh bg-app-bg">
      <AppTopBar />
      <main className="px-4 py-4 md:px-8 md:py-8">
        <AutoSlideshowTab token={token} stickyTop="top-16" />
      </main>
    </div>
  );
}
