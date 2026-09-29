'use client';

import { useEffect, useState } from 'react';
import type { ModelDetailDto, ModelStatus, SlideshowPattern } from '../../../types/admin/slideshowKnowledge';
import { adminFetch } from '../business/useAdminApi';
import { compact, errorClass } from './format';
import { PatternEditor } from './PatternEditor';
import { SlideStrip } from './SlideStrip';
import { useModel } from './useKnowledge';

type Props = { token: string; modelId: string; onClose: () => void; onChanged: () => void };

type Draft = { name: string; niches: string; pattern: SlideshowPattern };

const draftOf = (m: ModelDetailDto): Draft => ({ name: m.name, niches: m.niches.join(', '), pattern: m.pattern });

/** Cleans the edit before it is sent: empty rules and hooks dropped. */
const payload = (d: Draft, status?: ModelStatus) => ({
  name: d.name,
  niches: d.niches.split(',').map((n) => n.trim()).filter(Boolean),
  pattern: { ...d.pattern, visualRules: d.pattern.visualRules.map((r) => r.trim()).filter(Boolean), hookVariants: (d.pattern.hookVariants ?? []).map((h) => h.trim()).filter(Boolean) },
  ...(status ? { status } : {}),
});

function Examples({ model }: { model: ModelDetailDto }) {
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-bold tracking-wider text-muted uppercase">Proven examples · {model.references.length}</h3>
      {model.references.map((r) => (
        <div key={r.id} className="space-y-2">
          <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400">
            @{r.creator} · {compact(r.stats.views)} views · {compact(r.stats.saves)} saves ↗
          </a>
          <SlideStrip slides={r.slides} />
        </div>
      ))}
    </section>
  );
}

type EditorProps = { token: string; model: ModelDetailDto; onClose: () => void; onChanged: () => void };

/** The loaded model: examples, then the editable pattern, with save actions pinned at the bottom. */
function ModelEditor({ token, model, onClose, onChanged }: EditorProps) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(model));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const save = async (status?: ModelStatus) => {
    setSaving(true);
    setSaveError(null);
    try {
      await adminFetch(token, `/api/admin/slideshow-knowledge/models/${model.id}`, { method: 'PATCH', body: JSON.stringify(payload(draft, status)) });
      onChanged();
      if (status) onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-line px-4 dark:border-zinc-800">
        <CloseButton onClose={onClose} />
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          aria-label="Model name"
          className="min-w-0 flex-1 bg-transparent text-base font-bold text-ink focus:outline-none dark:text-zinc-100"
        />
      </header>
      <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
        <Examples model={model} />
        <section className="space-y-3 border-t border-line pt-5 dark:border-zinc-800">
          <h3 className="text-xs font-bold tracking-wider text-muted uppercase">Model · structure, not the creator&apos;s words</h3>
          <label className="block space-y-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
            <span>Niches (comma separated)</span>
            <input value={draft.niches} onChange={(e) => setDraft({ ...draft, niches: e.target.value })} className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal text-ink normal-case focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100" />
          </label>
          <PatternEditor pattern={draft.pattern} onChange={(pattern) => setDraft({ ...draft, pattern })} />
        </section>
      </div>
      <footer className="shrink-0 space-y-2 border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-zinc-800">
        {saveError && <p className={errorClass}>{saveError}</p>}
        <div className="flex flex-wrap gap-2">
          <button disabled={saving} onClick={() => void save('approved')} className="min-h-11 flex-1 rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95 disabled:opacity-40">
            {model.status === 'approved' ? 'Save' : 'Approve'}
          </button>
          <button disabled={saving} onClick={() => void save()} className="min-h-11 rounded-full border border-line px-5 text-sm font-semibold text-ink transition hover:bg-zinc-50 active:scale-95 disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900">
            Save draft
          </button>
          {model.status !== 'archived' && (
            <button disabled={saving} onClick={() => void save('archived')} className="min-h-11 rounded-full px-4 text-sm font-medium text-muted transition hover:text-red-600 disabled:opacity-40">
              Archive
            </button>
          )}
        </div>
      </footer>
    </>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button onClick={onClose} aria-label="Close" className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-zinc-100 hover:text-ink dark:hover:bg-zinc-800">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  );
}

/** Full-screen sheet on phones, side panel on desktop. Loads the model, then hands it to the editor. */
export function ModelDrawer({ token, modelId, onClose, onChanged }: Props) {
  const { model, error } = useModel(token, modelId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Slideshow model" onClick={(e) => e.stopPropagation()} className="flex h-full w-full flex-col bg-white shadow-xl md:max-w-2xl dark:bg-zinc-950">
        {model ? (
          <ModelEditor key={model.updatedAt} token={token} model={model} onClose={onClose} onChanged={onChanged} />
        ) : (
          <>
            <header className="flex min-h-14 shrink-0 items-center border-b border-line px-4 dark:border-zinc-800">
              <CloseButton onClose={onClose} />
            </header>
            <div className="space-y-3 p-4 md:p-6">
              {error ? <p className={errorClass}>{error}</p> : [0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
