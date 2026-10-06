'use client';

import { useState } from 'react';
import { SHORT_VIDEO_MODELS, type ShortVideoModel, type ShortWorkspaceDto } from '../../../types/admin/shorts';
import { createShort, useShortWorkspaces } from './useShorts';

type Props = { token: string; onClose: () => void; onCreated: (id: string) => void };

const optionClass = (selected: boolean) =>
  [
    'flex min-h-14 w-full items-start gap-3 rounded-xl border p-3 text-left transition active:scale-[0.99]',
    selected ? 'border-app-ink bg-app-sunken ring-1 ring-app-ink' : 'border-app-line hover:border-app-muted',
  ].join(' ');

function WorkspacePicker({ list, value, onChange }: { list: ShortWorkspaceDto[] | null; value: string | null; onChange: (id: string) => void }) {
  if (!list) return <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-app-sunken" />)}</div>;
  if (list.length === 0) {
    return <p className="rounded-xl border border-dashed border-app-line p-4 text-sm text-app-muted">No workspace has a brand yet. Run Auto Slideshow on a website first: it builds the brand profile and the hook bank a short needs.</p>;
  }
  return (
    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
      {list.map((w) => (
        <button key={w.id} type="button" onClick={() => onChange(w.id)} className={optionClass(value === w.id)} aria-pressed={value === w.id}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-app-ink">{w.brandName}</p>
            <p className="truncate text-xs text-app-muted">{w.url} · …{w.id.slice(-6)}</p>
          </div>
          <p className="shrink-0 text-right text-[11px] text-app-muted">
            {w.hooks} hooks
            <br />
            {w.shorts} shorts
          </p>
        </button>
      ))}
    </div>
  );
}

function ModelPicker({ value, onChange }: { value: ShortVideoModel; onChange: (m: ShortVideoModel) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {(Object.keys(SHORT_VIDEO_MODELS) as ShortVideoModel[]).map((m) => {
        const info = SHORT_VIDEO_MODELS[m];
        return (
          <button key={m} type="button" onClick={() => onChange(m)} className={optionClass(value === m)} aria-pressed={value === m}>
            <div>
              <p className="text-sm font-bold text-app-ink">{info.label}</p>
              <p className="text-[11px] text-app-muted">{info.detail}</p>
              <p className="mt-1 text-xs font-semibold text-app-ink">≈ ${(info.usdPerSecond * 25).toFixed(2)} clips / 25 s</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** Pick a workspace (brand already built) and a video model, then start a short. */
export function CreateShortPanel({ token, onClose, onCreated }: Props) {
  const { workspaces, error } = useShortWorkspaces(token, true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [model, setModel] = useState<ShortVideoModel>('veo');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const start = async () => {
    if (!workspaceId) return;
    setBusy(true);
    setFailure(null);
    try {
      onCreated((await createShort(token, workspaceId, model)).id);
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Could not start the short');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-t-2xl bg-app-panel p-5 shadow-xl sm:rounded-2xl sm:p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Create a short">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-app-ink">Create a short</h2>
            <p className="text-sm text-app-muted">The script uses the brand’s best unused bank hook and only its own facts. About 3-5 minutes.</p>
          </div>
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 rounded-full text-xl text-app-muted transition hover:bg-app-sunken" aria-label="Close">×</button>
        </div>
        <section className="space-y-2">
          <h3 className="text-xs font-bold tracking-wide text-app-muted uppercase">1 · Workspace</h3>
          {error ? <p className="text-sm text-app-danger">{error}</p> : <WorkspacePicker list={workspaces} value={workspaceId} onChange={setWorkspaceId} />}
        </section>
        <section className="space-y-2">
          <h3 className="text-xs font-bold tracking-wide text-app-muted uppercase">2 · Video model</h3>
          <ModelPicker value={model} onChange={setModel} />
        </section>
        {failure && <p className="rounded-xl bg-app-accent-soft p-3 text-sm text-app-danger">{failure}</p>}
        <button
          type="button"
          onClick={start}
          disabled={!workspaceId || busy}
          className="min-h-12 w-full rounded-xl bg-app-cta text-sm font-bold text-app-cta-ink shadow-sm transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Starting…' : 'Run'}
        </button>
      </div>
    </div>
  );
}
