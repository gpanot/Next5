'use client';

import { useCallback, useState } from 'react';
import { createLocalStore } from '../../src/lib/localStore';
import { AdminLogin } from '../../src/components/admin/AdminLogin';
import { BookingsTab } from '../../src/components/admin/BookingsTab';
import { PromptsTab } from '../../src/components/admin/PromptsTab';
import { UsersTab } from '../../src/components/admin/UsersTab';
import { OverviewTab } from '../../src/components/admin/business/OverviewTab';
import { PaymentsTab } from '../../src/components/admin/business/PaymentsTab';
import { PromiseTab } from '../../src/components/admin/business/PromiseTab';
import { QaTab } from '../../src/components/admin/business/QaTab';
import { WorkspacesTab } from '../../src/components/admin/business/WorkspacesTab';

type Tab = 'overview' | 'workspaces' | 'payments' | 'promise' | 'qa' | 'users' | 'bookings' | 'prompts';
const adminTokenStore = createLocalStore('admin_token');

const isAdminToken = (token: string): boolean => {
  try {
    return JSON.parse(atob(token.split('.')[1] ?? '')).type === 'admin';
  } catch {
    return false;
  }
};

export default function AdminPage() {
  const stored = adminTokenStore.useValue();
  const token = stored && isAdminToken(stored) ? stored : null;
  const [tab, setTab] = useState<Tab>('overview');

  const logout = useCallback(() => adminTokenStore.set(null), []);
  const handleToken = useCallback((t: string) => adminTokenStore.set(t), []);

  if (stored === undefined) return null;
  if (!token) return <AdminLogin onToken={handleToken} />;

  return (
    <div className="min-h-screen bg-[#f8f7f5]">
      <header className="border-b border-[#e9e1d6] bg-white px-6 py-3.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-[20px] tracking-[0.12em] text-[#221f1c] uppercase">Next5</span>
            <span className="rounded-full bg-[#221f1c] px-2 py-0.5 text-[9px] font-medium tracking-widest text-white uppercase">
              Admin
            </span>
          </div>
          <button onClick={logout} className="text-[12px] text-[#6e655c] hover:text-[#221f1c]">
            Sign out
          </button>
        </div>
      </header>

      <div className="border-b border-[#e9e1d6] bg-white px-6">
        <div className="mx-auto flex max-w-7xl gap-1">
          {(['overview', 'workspaces', 'payments', 'promise', 'qa', 'bookings', 'users', 'prompts'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'border-b-2 -mb-px px-4 py-3 text-[13px] font-medium capitalize transition-colors',
                tab === t
                  ? 'border-[#221f1c] text-[#221f1c]'
                  : 'border-transparent text-[#6e655c] hover:text-[#221f1c]',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {tab === 'overview'   && <OverviewTab   token={token} />}
        {tab === 'workspaces' && <WorkspacesTab token={token} />}
        {tab === 'payments'   && <PaymentsTab   token={token} />}
        {tab === 'promise'    && <PromiseTab    token={token} />}
        {tab === 'qa'         && <QaTab         token={token} />}
        {tab === 'users'    && <UsersTab    token={token} />}
        {tab === 'bookings' && <BookingsTab token={token} />}
        {tab === 'prompts'  && <PromptsTab  token={token} />}
      </main>
    </div>
  );
}
