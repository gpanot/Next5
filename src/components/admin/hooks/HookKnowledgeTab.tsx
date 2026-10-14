'use client';

import { useState } from 'react';
import type { HookKnowledgeDto } from '../../../types/admin/hookKnowledge';
import { KnowledgeForm } from './KnowledgeForm';
import { useHookKnowledge } from './useHookKnowledge';

type Knowledge = ReturnType<typeof useHookKnowledge>;

const card = 'rounded-xl border border-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950';

function EntryCard({ entry, knowledge }: { entry: HookKnowledgeDto; knowledge: Knowledge }) {
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  if (editing) {
    return (
      <li className={card}>
        <KnowledgeForm entry={entry} busy={knowledge.busy} onCancel={() => setEditing(false)} onSave={async (input) => { const ok = await knowledge.update(entry.id, input); if (ok) setEditing(false); return ok; }} />
      </li>
    );
  }
  const remove = () => window.confirm(`Delete “${entry.title}”?`) && void knowledge.remove(entry.id);
  return (
    <li className={card}>
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink dark:text-zinc-100">{entry.title}</p>
          <p className="text-xs text-muted">
            {entry.fileName ? `${entry.fileName} · ` : ''}{entry.body.length.toLocaleString()} characters · updated {new Date(entry.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <button type="button" onClick={() => setEditing(true)} className="min-h-11 rounded-full px-3 text-sm font-semibold text-ink transition hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-900">Edit</button>
        <button type="button" onClick={remove} disabled={knowledge.busy} className="min-h-11 rounded-full px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-950">Delete</button>
      </div>
      <pre className={`mt-3 overflow-hidden font-sans text-sm whitespace-pre-wrap text-ink/80 dark:text-zinc-300 ${open ? '' : 'max-h-24 [mask-image:linear-gradient(to_bottom,black_60%,transparent)]'}`}>{entry.body}</pre>
      <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 min-h-9 text-sm font-semibold text-muted transition hover:text-ink dark:hover:text-zinc-100">{open ? 'Show less' : 'Show all'}</button>
    </li>
  );
}

/**
 * Hook Knowledge: notes and .md/.txt files on what makes slideshow hooks work. The campaign editor's "Generate for me"
 * reads all of it (newest first) when it writes hooks, so keep it current as trends change.
 */
export function HookKnowledgeTab({ token }: { token: string }) {
  const knowledge = useHookKnowledge(token);
  const { entries } = knowledge;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl font-semibold text-ink dark:text-zinc-100">Hook Knowledge</h2>
        <p className="text-[13px] text-muted">What works on TikTok now. “Generate for me” in the campaign editor reads every entry, newest first.</p>
      </div>
      <section className={card} aria-label="Add knowledge">
        <KnowledgeForm busy={knowledge.busy} onSave={knowledge.create} />
      </section>
      {knowledge.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{knowledge.error}</p>}
      {entries === null ? (
        knowledge.loadError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{knowledge.loadError}</p>
        ) : (
          <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />)}</div>
        )
      ) : entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted dark:border-zinc-800">No knowledge yet. Add hook formulas or examples above.</p>
      ) : (
        <ul className="space-y-3">{entries.map((e) => <EntryCard key={e.id} entry={e} knowledge={knowledge} />)}</ul>
      )}
    </div>
  );
}
