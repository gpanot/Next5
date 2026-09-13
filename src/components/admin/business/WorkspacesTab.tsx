'use client';

import { useState } from 'react';
import { adminFetch, useAdminApi } from './useAdminApi';

type Row = { id: string; name: string; product: string; email: string; createdAt: string; onboardingStep: number; onboardingCompleted: boolean; trialUsed: boolean; plan: string | null; balance: number; batches: number; products: number };

export const WorkspacesTab = ({ token }: { token: string }) => {
  const [search, setSearch] = useState('');
  const { data, error, loading, refresh } = useAdminApi<{ workspaces: Row[] }>(token, `/api/admin/business/workspaces?search=${encodeURIComponent(search)}`);
  const [message, setMessage] = useState<string | null>(null);

  const grantCredits = async (row: Row) => {
    const amount = window.prompt(`Grant bonus photos to ${row.name} (${row.email}):`, '10');
    if (!amount) return;
    const note = window.prompt('Reason (stored in the audit log):', 'Validation pilot');
    if (!note) return;
    try {
      await adminFetch(token, `/api/admin/business/workspaces/${row.id}/credits`, { method: 'POST', body: JSON.stringify({ amount: Number(amount), note }) });
      setMessage(`Granted ${amount} photos to ${row.name}`);
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" className="w-72 rounded-lg border border-[#e9e1d6] bg-white px-3 py-2 text-[13px]" />
      {message && <p className="text-[13px] text-[#221f1c]">{message}</p>}
      {error && <p className="text-[13px] text-red-700">{error}</p>}
      {loading && !data && <p className="text-[13px] text-[#6e655c]">Loading…</p>}
      <div className="overflow-x-auto rounded-xl border border-[#e9e1d6] bg-white">
        <table className="w-full min-w-[900px] text-left text-[13px]">
          <thead className="bg-[#f8f7f5] text-[11px] uppercase tracking-wider text-[#6e655c]">
            <tr>{['Workspace', 'Owner', 'Product', 'Onboarding', 'Plan', 'Photos', 'Batches', 'Created', ''].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {(data?.workspaces ?? []).map((w) => (
              <tr key={w.id} className="border-t border-[#f1ece5]">
                <td className="px-4 py-3 font-medium text-[#221f1c]">{w.name}</td>
                <td className="px-4 py-3 text-[#6e655c]">{w.email}</td>
                <td className="px-4 py-3 capitalize">{w.product}</td>
                <td className="px-4 py-3">{w.onboardingCompleted ? 'Done' : `Step ${w.onboardingStep + 1}`}{w.trialUsed ? ' · trial' : ''}</td>
                <td className="px-4 py-3">{w.plan ?? '—'}</td>
                <td className="px-4 py-3 tabular-nums">{w.balance}</td>
                <td className="px-4 py-3 tabular-nums">{w.batches}{w.product === 'shop' ? ` · ${w.products} products` : ''}</td>
                <td className="px-4 py-3 text-[#6e655c]">{w.createdAt.slice(0, 10)}</td>
                <td className="px-4 py-3"><button onClick={() => grantCredits(w)} className="rounded-lg px-2 py-1 text-[12px] text-[#9c5c3a] hover:bg-[#f5f1ea]">Grant photos</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
