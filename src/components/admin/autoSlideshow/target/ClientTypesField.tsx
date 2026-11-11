'use client';

import type { FormEvent } from 'react';
import { MAX_CUSTOMER_INDUSTRIES, MAX_INDUSTRY_CHARS, type CustomerIndustriesDto } from '../../../../lib/customerIndustries';
import type { ClientTypesDraft } from './useClientTypesDraft';

const inputClass =
  'min-h-11 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-base text-ink transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-400';

function IndustryChip({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <li className="flex min-h-11 max-w-full items-center rounded-full border border-zinc-200 bg-zinc-100 pl-4 text-sm text-ink dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
      <span className="truncate">{name}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${name}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition hover:text-ink active:scale-95 dark:hover:text-zinc-100"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
      </button>
    </li>
  );
}

/** Chips, one-tap suggestions read from the site, and a text box. */
export function ClientTypesField({ draft, suggestions }: { draft: ClientTypesDraft; suggestions: string[] }) {
  const full = draft.names.length >= MAX_CUSTOMER_INDUSTRIES;
  const taken = new Set(draft.names.map((n) => n.toLowerCase()));
  const offered = suggestions.filter((n) => !taken.has(n.toLowerCase()));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.tooMany && draft.text.trim()) draft.addText();
  };
  return (
    <div className="space-y-2">
      {draft.names.length > 0
        ? <ul className="flex flex-wrap gap-2">{draft.names.map((n) => <IndustryChip key={n} name={n} onRemove={() => draft.remove(n)} />)}</ul>
        : <p className="rounded-xl border border-dashed border-zinc-200 p-3 text-sm text-muted dark:border-zinc-800">None yet. Add the kinds of clients you want more of.</p>}
      {!full && (
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={draft.text}
            onChange={(e) => draft.setText(e.target.value)}
            maxLength={MAX_INDUSTRY_CHARS}
            placeholder="Add one, like aged care"
            aria-label="Add a client type"
            className={inputClass}
          />
          <button type="submit" disabled={!draft.text.trim()} className="min-h-11 rounded-full border border-zinc-200 px-4 text-sm font-semibold text-ink transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-100">Add</button>
        </form>
      )}
      {!full && offered.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted">Also on your website</p>
          <div className="flex flex-wrap gap-2">
            {offered.map((n) => (
              <button key={n} type="button" onClick={() => draft.add(n)} aria-label={`Add ${n}`} className="min-h-11 rounded-full border border-dashed border-zinc-300 px-4 text-sm text-ink transition active:scale-[0.98] dark:border-zinc-700 dark:text-zinc-100">+ {n}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** The labelled field for the confirm screens; a pulse while the website is read. */
export function ClientTypesStep({ data, draft, reading }: { data: CustomerIndustriesDto | null; draft: ClientTypesDraft; reading: boolean }) {
  if (!data?.ready && !reading) return null;
  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-ink dark:text-zinc-100">Who do you want more of?</h3>
        <p className="text-sm text-muted">We read these from your website. Fix them if they are wrong. Up to {MAX_CUSTOMER_INDUSTRIES}.</p>
      </div>
      {data?.ready
        ? <ClientTypesField draft={draft} suggestions={data.suggestions} />
        : <div aria-busy="true" aria-label="Reading your client types" className="h-11 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />}
    </div>
  );
}
