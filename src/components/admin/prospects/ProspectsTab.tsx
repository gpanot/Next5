'use client';

import { useState, type FormEvent } from 'react';
import { EmptyState } from '../../ui/EmptyState';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonCard } from '../../ui/Skeleton';
import { PROSPECT_BLITZ, PROSPECT_CAST, PROSPECT_HOOKS } from '../../../types/admin/prospects';
import { ProspectRow } from './ProspectRow';
import { useProspects } from './useProspects';

const input =
  'min-h-11 w-full rounded-xl border border-app-line bg-app-bg px-3 text-[15px] text-app-ink placeholder:text-app-muted focus:outline-none focus:ring-2 focus:ring-app-ink/20';

/** "New prospect": the SME's website (and a name for the link page). */
function CreateForm({ onCreate }: { onCreate: (url: string, name: string) => Promise<void> }) {
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
        <h2 className="text-[15px] font-semibold text-app-ink">New prospect</h2>
        <p className="text-[13px] text-app-muted">
          14 days of posts for their site: {PROSPECT_BLITZ} videos (stock photos), {PROSPECT_CAST} Brand Cast and {PROSPECT_HOOKS} Hooks Volume slideshows. You check the faces first. Days 1-7 are made in full, days 8-14 as previews until they pay. About $0.70.
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

/** Admin › Prospects: make an SME's next 14 days of posts and send them a review link before they sign up. */
export function ProspectsTab({ token }: { token: string }) {
  const { packs, error, loading, refresh, create, approve, remove } = useProspects(token);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <CreateForm onCreate={create} />
      {error && <ErrorState message={error} onRetry={refresh} />}
      {loading && (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}
      {!loading && !error && packs.length === 0 && <EmptyState title="No prospects yet" body="Add a website above to make their first 14 days of posts." />}
      {packs.length > 0 && (
        <ul className="space-y-3">
          {packs.map((p) => <ProspectRow key={p.id} token={token} pack={p} onApprove={approve} onDelete={remove} />)}
        </ul>
      )}
    </div>
  );
}
