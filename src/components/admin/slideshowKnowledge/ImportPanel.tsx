'use client';

import { useState, type FormEvent } from 'react';
import type { CandidateDto, CandidateSource } from '../../../types/admin/slideshowKnowledge';
import { adminFetch } from '../business/useAdminApi';
import { CandidatePicker } from './CandidatePicker';
import { cardClass, errorClass } from './format';

type Mode = 'links' | CandidateSource;

const MODES: { id: Mode; label: string; placeholder: string }[] = [
  { id: 'links', label: 'Links', placeholder: 'Paste TikTok slideshow links, one per line' },
  { id: 'creator', label: 'Creator', placeholder: '@scratchaiapp' },
  { id: 'keyword', label: 'Keyword', placeholder: 'golf tips' },
];

type Props = { token: string; onImported: () => void };

const inputClass = 'w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-ink placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100';
const buttonClass = 'min-h-11 shrink-0 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-40 dark:bg-blue-500 dark:hover:bg-blue-400';

/** Three ways in: paste links, a creator's most popular slideshows, or a keyword search. */
export function ImportPanel({ token, onImported }: Props) {
  const [mode, setMode] = useState<Mode>('links');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateDto[] | null>(null);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await work();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const importUrls = (urls: string[]) =>
    run(async () => {
      const res = await adminFetch<{ created: number; skipped: number }>(token, '/api/admin/slideshow-knowledge/references', { method: 'POST', body: JSON.stringify({ urls }) });
      setNotice(`${res.created} importing${res.skipped ? ` · ${res.skipped} already in the library` : ''}`);
      setCandidates(null);
      if (mode === 'links') setText('');
      onImported();
    });

  const find = () =>
    run(async () => {
      const res = await adminFetch<{ candidates: CandidateDto[] }>(token, '/api/admin/slideshow-knowledge/candidates', { method: 'POST', body: JSON.stringify({ source: mode, query: text, limit: 12 }) });
      setCandidates(res.candidates);
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    if (mode === 'links') void importUrls(text.split(/[\s,]+/).filter(Boolean));
    else void find();
  };

  const current = MODES.find((m) => m.id === mode)!;

  return (
    <section className={`${cardClass} space-y-4 p-4 md:p-5`}>
      <div className="flex gap-1 rounded-full bg-zinc-100 p-1 dark:bg-zinc-800" role="tablist">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => { setMode(m.id); setCandidates(null); setError(null); setText(''); }}
            className={`min-h-10 flex-1 rounded-full text-sm font-medium transition ${mode === m.id ? 'bg-white text-ink shadow-sm dark:bg-zinc-950 dark:text-zinc-100' : 'text-muted hover:text-ink dark:hover:text-zinc-100'}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className={mode === 'links' ? 'space-y-3' : 'flex flex-col gap-3 sm:flex-row'}>
        {mode === 'links' ? (
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={current.placeholder} className={inputClass} />
        ) : (
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={current.placeholder} autoCapitalize="none" className={inputClass} />
        )}
        <button type="submit" disabled={busy || !text.trim()} className={buttonClass}>
          {busy ? 'Working…' : mode === 'links' ? 'Import' : mode === 'creator' ? 'Find top slideshows' : 'Search'}
        </button>
      </form>

      {error && <p className={errorClass}>{error}</p>}
      {notice && <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{notice}</p>}
      {busy && mode !== 'links' && !candidates && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}
        </div>
      )}
      {candidates && <CandidatePicker key={candidates.map((c) => c.postId).join()} candidates={candidates} busy={busy} onImport={(urls) => void importUrls(urls)} />}
    </section>
  );
}
