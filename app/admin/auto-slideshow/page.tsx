'use client';

import { useCallback } from 'react';
import { adminTokenStore, useAdminToken } from '../../../src/lib/adminToken';
import { AdminLogin } from '../../../src/components/admin/AdminLogin';
import { AutoSlideshowTab } from '../../../src/components/admin/autoSlideshow/AutoSlideshowTab';

/** Auto Slideshow as a standalone page — same tab as in the admin, no admin chrome. */
export default function AutoSlideshowPage() {
  const token = useAdminToken();
  const handleToken = useCallback((t: string) => adminTokenStore.set(t), []);

  if (token === undefined) return null;
  if (!token) return <AdminLogin onToken={handleToken} />;

  return (
    <main className="min-h-dvh bg-white px-4 py-4 md:px-8 md:py-8 dark:bg-zinc-950">
      <AutoSlideshowTab token={token} />
    </main>
  );
}
