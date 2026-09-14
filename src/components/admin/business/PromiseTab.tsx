'use client';

import { useState } from 'react';
import { adminFetch, useAdminApi } from './useAdminApi';

type Claim = { id: string; workspace: string; product: string; email: string; platform: string; metric: string; beforeAverage: number; afterAverage: number; postsCounted: number; links: string[]; note: string | null; sharePermission: boolean; status: string; outcome: string; adminNote: string | null; createdAt: string };

/** Beat-your-feed claims: wins (testimonial leads) and misses (free month to grant or decline). */
export const PromiseTab = ({ token }: { token: string }) => {
  const { data, error, loading, refresh } = useAdminApi<{ claims: Claim[] }>(token, '/api/admin/business/promise');
  const [message, setMessage] = useState<string | null>(null);

  const decide = async (claim: Claim, decision: 'grant' | 'decline') => {
    const note = window.prompt(decision === 'grant' ? 'Note (optional)' : 'Why decline?') ?? undefined;
    try {
      await adminFetch(token, `/api/admin/business/promise/${claim.id}`, { method: 'POST', body: JSON.stringify({ decision, note }), headers: { 'Content-Type': 'application/json' } });
      setMessage(`${claim.email}: ${decision === 'grant' ? 'free month granted' : 'declined'}`);
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed');
    }
  };

  if (error) return <p className="text-[13px] text-red-700">{error}</p>;
  if (loading && !data) return <p className="text-[13px] text-[#6e655c]">Loading…</p>;
  if (!data?.claims.length) return <p className="text-[13px] text-[#6e655c]">No promise claims yet.</p>;
  const wins = data.claims.filter((c) => c.outcome === 'won');
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-[#6e655c]">{wins.length} of {data.claims.length} claims beat their feed · average lift {Math.round(wins.reduce((s, c) => s + (c.afterAverage - c.beforeAverage) / Math.max(1, c.beforeAverage), 0) / Math.max(1, wins.length) * 100)}% on wins</p>
      {message && <p className="text-[13px] text-[#221f1c]">{message}</p>}
      <ul className="flex flex-col gap-3">
        {data.claims.map((c) => (
          <li key={c.id} className="rounded-xl border border-[#e9e1d6] bg-white p-4 text-[13px]">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium text-[#221f1c]">{c.workspace} · {c.email} · {c.product}</p>
              <p className="text-[#6e655c]">{new Date(c.createdAt).toLocaleDateString()} · {c.status}</p>
            </div>
            <p className="mt-1 text-[#221f1c]">
              {c.platform} {c.metric}: <span className="tabular-nums">{c.beforeAverage}</span> → <span className="font-semibold tabular-nums">{c.afterAverage}</span> over {c.postsCounted} posts ·{' '}
              <span className={c.outcome === 'won' ? 'text-emerald-700' : 'text-[#9c5c3a]'}>{c.outcome === 'won' ? 'beat their feed' : 'missed — free month owed'}</span>
              {c.sharePermission && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">OK to share</span>}
            </p>
            {c.links.length > 0 && <ul className="mt-1 flex flex-wrap gap-2">{c.links.map((l) => <li key={l}><a href={l} target="_blank" rel="noreferrer" className="text-[#9c5c3a] underline">{new URL(l).hostname}</a></li>)}</ul>}
            {c.note && <p className="mt-1 text-[#6e655c]">{c.note}</p>}
            {c.status === 'pending' && (
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => void decide(c, 'grant')} className="rounded-lg bg-[#221f1c] px-3 py-1 text-white">Grant free month</button>
                <button type="button" onClick={() => void decide(c, 'decline')} className="rounded-lg px-3 py-1 text-[#9c5c3a] hover:bg-[#f5f1ea]">Decline</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
