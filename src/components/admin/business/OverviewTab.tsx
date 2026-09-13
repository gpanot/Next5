'use client';

import { useState } from 'react';
import type { BusinessMetrics } from '../../../types/business/admin';
import { formatUsd, formatVnd } from '../../../lib/money';
import { useAdminApi } from './useAdminApi';

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="rounded-xl border border-[#e9e1d6] bg-white p-4">
    <p className="text-[11px] uppercase tracking-widest text-[#6e655c]">{label}</p>
    <p className="mt-1 text-[24px] font-semibold tabular-nums text-[#221f1c]">{value}</p>
    {sub && <p className="mt-0.5 text-[12px] text-[#6e655c]">{sub}</p>}
  </div>
);

const pct = (n: number) => `${Math.round(n * 100)}%`;

export const OverviewTab = ({ token }: { token: string }) => {
  const [days, setDays] = useState(30);
  const { data, error, loading } = useAdminApi<{ metrics: BusinessMetrics }>(token, `/api/admin/business/metrics?days=${days}`);
  const m = data?.metrics;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setDays(d)} className={`rounded-full px-3 py-1 text-[12px] ${days === d ? 'bg-[#221f1c] text-white' : 'bg-white text-[#6e655c] ring-1 ring-[#e9e1d6]'}`}>Last {d} days</button>
        ))}
        {loading && <span className="text-[12px] text-[#6e655c]">Loading…</span>}
      </div>
      {error && <p className="text-[13px] text-red-700">{error}</p>}
      {m && (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Signups" value={String(m.signups.brand + m.signups.shop)} sub={`Brand ${m.signups.brand} · Shop ${m.signups.shop}`} />
            <Stat label="Trials" value={String(m.trials)} sub={`Onboarding done ${m.onboardingCompleted}`} />
            <Stat label="Trial → paid" value={pct(m.trialToPaid)} sub="workspaces with a paid plan" />
            <Stat label="Paid payments" value={String(m.paidPayments)} sub={`${formatUsd(m.revenueUsdCents)} · ${formatVnd(m.revenueVnd)}`} />
            <Stat label="Batches" value={String(m.batches)} sub={`${m.itemsReady} ready · ${m.itemsFailed} failed`} />
            <Stat label="Redo rate" value={pct(m.redoRate)} sub={Object.entries(m.redoReasons).map(([k, v]) => `${k} ${v}`).join(' · ') || 'no redos'} />
            <Stat label="Provider cost" value={`$${m.providerCostUsd.toFixed(2)}`} sub={m.revenueUsdCents ? `margin ${pct(1 - (m.providerCostUsd * 100) / m.revenueUsdCents)}` : 'no revenue yet'} />
            <Stat label="Active plans" value={String(Object.values(m.activePlans).reduce((a, b) => a + b, 0))} sub={Object.entries(m.activePlans).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'} />
          </section>
          <p className="text-[12px] text-[#6e655c]">Payments are simulated while demand is validated (D7) — revenue here counts simulated transfers.</p>
        </>
      )}
    </div>
  );
};
