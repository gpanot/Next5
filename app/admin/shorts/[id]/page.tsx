'use client';

import { useParams } from 'next/navigation';
import { useCallback } from 'react';
import { adminTokenStore, useAdminToken } from '../../../../src/lib/adminToken';
import { AdminLogin } from '../../../../src/components/admin/AdminLogin';
import { ShortDetail } from '../../../../src/components/admin/shorts/ShortDetail';

/** Admin › Shorts › one short in full page. */
export default function AdminShortPage() {
  const { id } = useParams<{ id: string }>();
  const token = useAdminToken();
  const handleToken = useCallback((t: string) => adminTokenStore.set(t), []);
  if (token === undefined) return null;
  if (!token) return <AdminLogin onToken={handleToken} />;
  return (
    <main data-surface="business" className="min-h-dvh bg-app-bg px-4 py-6 md:px-8 md:py-10">
      <ShortDetail token={token} id={id} />
    </main>
  );
}
