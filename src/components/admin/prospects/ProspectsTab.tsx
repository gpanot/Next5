'use client';

import { useState, type FormEvent } from 'react';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonCard } from '../../ui/Skeleton';
import { PROSPECT_BLITZ, PROSPECT_CAST, PROSPECT_HOOKS, PROSPECT_MAX_ACTIVE, type ProspectPackDto } from '../../../types/admin/prospects';
import { ProspectRow } from './ProspectRow';
import { averages, formatDuration } from './timing';
import { useProspects } from './useProspects';

const input =
  'min-h-11 w-full rounded-xl border border-app-line bg-app-bg px-3 text-[15px] text-app-ink placeholder:text-app-muted focus:outline-none focus:ring-2 focus:ring-app-ink/20';

/** Eye button: hides the costs on the cards (for screen recordings). */
function CostToggle({ hidden, onToggle }: { hidden: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={hidden} aria-label={hidden ? 'Show costs' : 'Hide costs'} title={hidden ? 'Show costs' : 'Hide costs'} className="-m-2 flex size-11 items-center justify-center rounded-xl text-app-muted transition hover:bg-zinc-100 hover:text-app-ink active:scale-95 dark:hover:bg-zinc-800">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
        {hidden && <path d="M3 3l18 18" />}
      </svg>
    </button>
  );
}

/** "New prospect": the SME's website (and a name for the link page). */
function CreateForm({ onCreate, hideCost, onToggleCost }: { onCreate: (url: string, name: string) => Promise<void>; hideCost: boolean; onToggleCost: () => void }) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    await onCreate(url, name)
      .then(() => {
        setUrl('');
        setName('');
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not create it.'));
    setBusy(false);
  };
  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-3 rounded-xl border border-app-line bg-app-panel p-4 shadow-sm">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-app-ink">New prospect</h2>
          <CostToggle hidden={hideCost} onToggle={onToggleCost} />
        </div>
        <p className="text-[13px] text-app-muted">
          14 days of posts for their site: {PROSPECT_BLITZ} videos (stock photos), {PROSPECT_CAST} Brand Cast and {PROSPECT_HOOKS} Hooks Volume slideshows. You check the faces first. Days 1-7 are made in full, days 8-14 as previews until they pay. Up to {PROSPECT_MAX_ACTIVE} are made at once: the others wait their turn (keep this tab open).
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="theirbusiness.com" inputMode="url" autoCapitalize="none" required aria-label="Website" className={input} />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" aria-label="Business name" className={input} />
        <button type="submit" disabled={busy || !url.trim()} className="min-h-11 rounded-xl bg-app-ink px-5 text-[14px] font-semibold text-app-bg shadow-sm transition active:scale-95 disabled:opacity-50">
          {busy ? 'Creating…' : 'Create'}
        </button>
      </div>
      {error && <p role="alert" className="text-[13px] text-app-danger">{error}</p>}
    </form>
  );
}

/** Average make time and cost of the finished packs on the list. */
function Averages({ packs, hideCost }: { packs: ProspectPackDto[]; hideCost: boolean }) {
  const avg = averages(packs);
  if (!avg) return null;
  return (
    <p className="px-1 text-[12px] tabular-nums text-app-muted">
      Average over {avg.count} finished {avg.count === 1 ? 'pack' : 'packs'}: {formatDuration(avg.sec)} to make (face check wait not counted){!hideCost && ` · $${avg.usd.toFixed(2)}`}
    </p>
  );
}

/** Admin › Prospects: make an SME's next 14 days of posts and send them a review link before they sign up. */
export function ProspectsTab({ token }: { token: string }) {
  const { packs, error, loading, refresh, create, approve, remove } = useProspects(token);
  const [hideCost, setHideCost] = useState(false);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <CreateForm onCreate={create} hideCost={hideCost} onToggleCost={() => setHideCost((h) => !h)} />
      {error && <ErrorState message={error} onRetry={refresh} />}
      {loading && (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}
      {!loading && !error && packs.length === 0 && <EmptyState title="No prospects yet" body="Add a website above to make their first 14 days of posts." />}
      <Averages packs={packs} hideCost={hideCost} />
      {packs.length > 0 && (
        <ul className="space-y-3">
          {packs.map((p) => <ProspectRow key={p.id} token={token} pack={p} hideCost={hideCost} onApprove={approve} onDelete={remove} />)}
        </ul>
      )}
    </div>
  );
}
