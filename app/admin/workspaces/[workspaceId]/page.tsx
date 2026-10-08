'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback } from 'react';
import { adminTokenStore, useAdminToken } from '../../../../src/lib/adminToken';
import { AdminLogin } from '../../../../src/components/admin/AdminLogin';
import { WorkspaceDetailPage } from '../../../../src/components/admin/workspaceDetail/WorkspaceDetailPage';

/** One user's workspace, for admins: opened in a new tab from the Users and Workspaces tabs. */
export default function AdminWorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const token = useAdminToken();
  const handleToken = useCallback((t: string) => adminTokenStore.set(t), []);

  if (token === undefined) return null;
  if (!token) return <AdminLogin onToken={handleToken} />;

  return (
    <div className="min-h-dvh bg-surface dark:bg-zinc-950">
      <nav className="flex h-14 items-center gap-2 border-b border-line bg-white px-4 md:px-8 dark:border-zinc-800 dark:bg-zinc-900">
        <Link href="/admin" className="font-display text-[17px] tracking-[0.12em] text-ink uppercase dark:text-zinc-100">Next5</Link>
        <span className="rounded-full bg-ink px-2 py-0.5 text-[9px] font-medium tracking-widest text-white uppercase dark:bg-zinc-100 dark:text-zinc-900">Admin</span>
      </nav>
      <main className="px-4 py-4 pb-24 md:px-8 md:py-8">
        <WorkspaceDetailPage token={token} workspaceId={workspaceId} />
      </main>
    </div>
  );
}
