'use client';

import { useState } from 'react';
import { formatUsd, formatVnd } from '../../../lib/money';
import { adminFetch, useAdminApi } from './useAdminApi';

type Row = { id: string; email: string; item: string; state: string; provider: string; reference: string; amountUsdCents: number | null; amountVnd: number; paidVnd: number | null; createdAt: string; paidAt: string | null };

const STATES = ['', 'pending', 'paid', 'underpaid', 'expired'] as const;

export const PaymentsTab = ({ token }: { token: string }) => {
  const [state, setState] = useState('');
  const { data, error, refresh } = useAdminApi<{ payments: Row[] }>(token, `/api/admin/business/payments?state=${state}`);
  const [message, setMessage] = useState<string | null>(null);

  const markPaid = async (row: Row) => {
    if (!window.confirm(`Confirm ${formatVnd(row.amountVnd)} received for ${row.reference} (${row.email})?`)) return;
    try {
      const res = await adminFetch<{ outcome: string }>(token, `/api/admin/business/payments/${row.id}/mark-paid`, { method: 'POST' });
      setMessage(`${row.reference}: ${res.outcome}`);
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {STATES.map((s) => <button key={s} onClick={() => setState(s)} className={`rounded-full px-3 py-1 text-[12px] capitalize ${state === s ? 'bg-[#221f1c] text-white' : 'bg-white text-[#6e655c] ring-1 ring-[#e9e1d6]'}`}>{s || 'All'}</button>)}
      </div>
      {message && <p className="text-[13px]">{message}</p>}
      {error && <p className="text-[13px] text-red-700">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-[#e9e1d6] bg-white">
        <table className="w-full min-w-[900px] text-left text-[13px]">
          <thead className="bg-[#f8f7f5] text-[11px] uppercase tracking-wider text-[#6e655c]">
            <tr>{['Created', 'Customer', 'Item', 'Amount', 'Reference', 'State', ''].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {(data?.payments ?? []).map((p) => (
              <tr key={p.id} className="border-t border-[#f1ece5]">
                <td className="px-4 py-3 text-[#6e655c]">{p.createdAt.slice(0, 16).replace('T', ' ')}</td>
                <td className="px-4 py-3">{p.email}</td>
                <td className="px-4 py-3">{p.item}</td>
                <td className="px-4 py-3 tabular-nums">{p.amountUsdCents !== null ? `${formatUsd(p.amountUsdCents, { showCents: true })} · ` : ''}{formatVnd(p.amountVnd)}</td>
                <td className="px-4 py-3 font-mono text-[12px]">{p.reference}{p.provider === 'mock' ? ' · mock' : ''}</td>
                <td className="px-4 py-3 capitalize">{p.state}</td>
                <td className="px-4 py-3">{(p.state === 'pending' || p.state === 'expired' || p.state === 'underpaid') && <button onClick={() => markPaid(p)} className="rounded-lg px-2 py-1 text-[12px] text-[#9c5c3a] hover:bg-[#f5f1ea]">Mark paid</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
