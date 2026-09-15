'use client';

import { AppLink as Link } from './AppLink';
import { useEffect, useRef, useState } from 'react';
import { formatShortDate } from '../../../lib/dates';
import { ProgressMeter } from '../../ui/ProgressMeter';
import { useWorkspace } from './WorkspaceProvider';

export const CreditsPill = () => {
  const { me } = useWorkspace();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!me) return null;
  const { balance, subscription } = me;
  const monthly = subscription?.monthlyCredits ?? 0;
  const label = balance.trial > 0 && balance.total === 0 ? `${balance.trial} free` : `${balance.total} photos`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-9 items-center gap-2 rounded-full border border-app-line bg-app-panel px-3 text-[13px] font-medium tabular-nums text-app-ink transition-colors duration-200 hover:bg-app-sunken"
      >
        <span className={`h-2 w-2 rounded-full ${monthly && balance.plan < monthly * 0.2 ? 'bg-app-warning' : 'bg-app-success'}`} aria-hidden />
        {label}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-72 rounded-2xl border border-app-line bg-app-panel p-4 shadow-lg animate-fade-in">
          {monthly > 0 && <ProgressMeter used={Math.max(0, monthly - balance.plan)} total={monthly} label="This month" />}
          <dl className="mt-3 space-y-1.5 text-[13px]">
            <div className="flex justify-between"><dt className="text-app-muted">Plan photos</dt><dd className="tabular-nums">{balance.plan}</dd></div>
            <div className="flex justify-between"><dt className="text-app-muted">Top-up photos</dt><dd className="tabular-nums">{balance.topup + balance.bonus}</dd></div>
            {balance.trial > 0 && <div className="flex justify-between"><dt className="text-app-muted">Free trial</dt><dd className="tabular-nums">{balance.trial}</dd></div>}
          </dl>
          {balance.nextExpiry && <p className="mt-3 text-[12px] text-app-muted">{balance.nextExpiry.credits} expire on {formatShortDate(balance.nextExpiry.at)}</p>}
          <Link href="/app/billing" onClick={() => setOpen(false)} className="mt-3 flex h-9 items-center justify-center rounded-xl bg-app-accent text-[13px] font-medium text-app-accent-ink hover:opacity-90">Top up photos</Link>
        </div>
      )}
    </div>
  );
};
