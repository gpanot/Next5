'use client';

import type { ReactNode } from 'react';
import type { BlitzStoryCardDto } from '../../../types/admin/workspaceDetail';

export const ARCHETYPE_LABELS: Record<string, string> = {
  call_out: 'Call-out',
  contrarian: 'Myth buster',
  proof_result: 'Result first',
  fear_inaction: 'Cost of waiting',
  curiosity: 'Curiosity',
  action: 'Challenge',
};

const STATUS_STYLES: Record<string, string> = {
  kept: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  rendered: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  edited: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  discarded: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  failed: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
};

const day = (iso: string) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function StatusPill({ card }: { card: BlitzStoryCardDto }) {
  const label = card.status === 'proposed' ? (card.plannedAt ? `planned ${day(card.plannedAt)}` : 'reserve') : card.status;
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[card.status] ?? 'bg-zinc-100 text-muted dark:bg-zinc-800'}`}>
      {label}
    </span>
  );
}

function Part({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </div>
  );
}

function BlitzCard({ card, index }: { card: BlitzStoryCardDto; index: number }) {
  return (
    <li className="space-y-3 rounded-xl border border-line bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted">
          Blitz {index + 1} · {ARCHETYPE_LABELS[card.archetype] ?? card.archetype}
        </span>
        <StatusPill card={card} />
      </div>
      <Part label="Hook">
        <p className="text-sm font-semibold text-ink dark:text-zinc-100">{card.hook || '—'}</p>
      </Part>
      <Part label="Meat">
        <ol className="mt-0.5 space-y-1 border-l-2 border-line pl-3 dark:border-zinc-700">
          {card.meat.map((m) => (
            <li key={m.label} className="text-sm text-ink dark:text-zinc-200">
              <span className="text-xs text-muted">{m.label}: </span>{m.text}
            </li>
          ))}
        </ol>
      </Part>
      <Part label="CTA">
        <p className="text-sm font-medium text-ink dark:text-zinc-100">{card.cta || '—'}</p>
      </Part>
      {card.otherHooks.length > 0 && (
        <Part label="Other first lines">
          <ul className="mt-0.5 space-y-0.5 text-sm text-muted">
            {card.otherHooks.map((h) => <li key={h}>· {h}</li>)}
          </ul>
        </Part>
      )}
    </li>
  );
}

/** The Blitz cards made from one bank story, each as its slides read: hook, meat, CTA. */
export function StoryBlitzCards({ cards }: { cards: BlitzStoryCardDto[] }) {
  if (cards.length === 0) {
    return <p className="rounded-xl border border-dashed border-line p-3 text-sm text-muted dark:border-zinc-800">No Blitz made from this story yet.</p>;
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((c, i) => <BlitzCard key={c.id} card={c} index={i} />)}
    </ul>
  );
}
