'use client';

/**
 * IDC niche chips for a lab's research step. Clicking a chip runs one search for that niche.
 * Renders nothing when the lab is not linked to Campaign Studio.
 */

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useIdcNiches } from './useIdcNiches';

type Props = {
  /** The niche of the search running or last run, highlighted. */
  active: string;
  /** True while a search is in flight — one niche at a time. */
  busy: boolean;
  onPick: (niche: string) => void;
};

const Hint = ({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'error' }) => (
  <p className={`text-[12px] ${tone === 'error' ? 'text-red-700' : 'text-muted'}`}>{children}</p>
);

export function IdcNichePicker({ active, busy, onPick }: Props) {
  const { linked, hasRun, state } = useIdcNiches();
  if (!linked) return null;

  const activeKey = active.trim().toLowerCase();

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        IDC niches{state.status === 'ready' ? ` · ${state.sourceUrl}` : ''}
      </p>

      {!hasRun && <Hint>Pick a run in the Profile step to search its IDC niches.</Hint>}

      {state.status === 'loading' && (
        <div className="flex flex-wrap gap-2" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => <div key={i} className="h-9 w-28 animate-pulse rounded-full bg-surface-alt" />)}
        </div>
      )}

      {state.status === 'error' && <Hint tone="error">{state.error}</Hint>}

      {state.status === 'ready' && state.niches.length === 0 && (
        <Hint>No IDC niches on this profile. Add them in Profile → Market → IDC Niches.</Hint>
      )}

      {state.status === 'ready' && state.niches.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {state.niches.map((niche) => {
              const isActive = niche.toLowerCase() === activeKey;
              return (
                <button
                  key={niche}
                  type="button"
                  disabled={busy}
                  onClick={() => onPick(niche)}
                  aria-pressed={isActive}
                  className={[
                    'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-4 text-[12px] font-medium transition-colors disabled:opacity-50',
                    isActive ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-ink/40',
                  ].join(' ')}
                >
                  {isActive && busy && <Loader2 className="h-3 w-3 animate-spin" />}
                  {niche}
                </button>
              );
            })}
          </div>
          <Hint>Tap a niche to search TikTok for it. One niche per search.</Hint>
        </>
      )}
    </div>
  );
}
