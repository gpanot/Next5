'use client';

import { useCallback } from 'react';
import { adminTokenStore, useAdminToken } from '../../../src/lib/adminToken';
import { AdminLogin } from '../../../src/components/admin/AdminLogin';
import { ShortsPage } from '../../../src/components/admin/shorts/ShortsPage';

/** Admin › Shorts: list of shorts + Create. */
export default function AdminShortsPage() {
  const token = useAdminToken();
  const handleToken = useCallback((t: string) => adminTokenStore.set(t), []);
  if (token === undefined) return null;
  if (!token) return <AdminLogin onToken={handleToken} />;
  return (
    <main data-surface="business" className="min-h-dvh bg-app-bg px-4 py-6 md:px-8 md:py-10">
      <ShortsPage token={token} />
    </main>
  );
}
