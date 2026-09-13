'use client';

import { useCallback, useState } from 'react';
import { AdminLogin } from '../../src/components/admin/AdminLogin';
import { BookingsTab } from '../../src/components/admin/BookingsTab';
import { PromptsTab } from '../../src/components/admin/PromptsTab';
import { UsersTab } from '../../src/components/admin/UsersTab';

type Tab = 'users' | 'bookings' | 'prompts';
const ADMIN_TOKEN_KEY = 'admin_token';

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!stored) return null;
    try {
      const payload = JSON.parse(atob(stored.split('.')[1]));
      if (payload.type !== 'admin') { localStorage.removeItem(ADMIN_TOKEN_KEY); return null; }
      return stored;
    } catch {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      return null;
    }
  });
  const [tab, setTab] = useState<Tab>('bookings');

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
  }, []);

  const handleToken = useCallback((t: string) => {
    localStorage.setItem(ADMIN_TOKEN_KEY, t);
    setToken(t);
  }, []);

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
          {(['bookings', 'users', 'prompts'] as Tab[]).map((t) => (
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
        {tab === 'users'    && <UsersTab    token={token} />}
        {tab === 'bookings' && <BookingsTab token={token} />}
        {tab === 'prompts'  && <PromptsTab  token={token} />}
      </main>
    </div>
  );
}
