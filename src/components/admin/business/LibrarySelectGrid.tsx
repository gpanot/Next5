'use client';

/**
 * Multi-select delete for any Assets Library section: a "Select" toggle above the grid, a
 * check badge on each card, and a bottom bar with select all and delete (second tap confirms).
 */

import { useState } from 'react';
import { Check, Loader2, Trash2, X } from 'lucide-react';

export type LibrarySection = 'memes' | 'videos' | 'sounds' | 'aiPictures' | 'ugcVideos' | 'hookVideos';

type DeleteResult = { deleted: string[]; failed: Array<{ id: string; error: string }> };

async function postDelete(token: string, section: LibrarySection, ids: string[]): Promise<DeleteResult> {
  const res = await fetch('/api/admin/assets-library/delete', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ section, ids }),
  });
  const body = (await res.json().catch(() => null)) as (DeleteResult & { message?: string }) | null;
  if (!res.ok || !body) throw new Error(body?.message ?? `HTTP ${res.status}`);
  return body;
}

/** Selection and delete state for one section. */
function useBulkDelete(token: string, section: LibrarySection, onRemoved: (ids: string[]) => void) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (!next.delete(id)) next.add(id);
    return next;
  });

  const remove = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await postDelete(token, section, [...selected]);
      onRemoved(result.deleted);
      setSelected(new Set(result.failed.map((f) => f.id)));
      const reasons = [...new Set(result.failed.map((f) => f.error))].join(' ');
      setMessage(`${result.deleted.length} deleted.${result.failed.length ? ` ${result.failed.length} kept: ${reasons}` : ''}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Delete failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return { selected, setSelected, toggle, busy, message, setMessage, remove };
}

type CardProps = { selecting: boolean; selected: boolean; onToggle: () => void; children: React.ReactNode };

/** Wraps a card. In select mode, a tap anywhere on the card toggles it (the card's own controls are covered). */
function SelectableCard({ selecting, selected, onToggle, children }: CardProps) {
  return (
    <div className={`relative grid rounded-xl transition-shadow ${selected ? 'ring-2 ring-red-500' : ''}`}>
      {children}
      {selecting && (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={selected}
          aria-label={selected ? 'Unselect' : 'Select'}
          className={`absolute inset-0 z-10 cursor-pointer rounded-xl transition-colors ${selected ? 'bg-white/30 dark:bg-black/30' : 'hover:bg-black/5'}`}
        >
          <span className={`absolute left-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 transition-colors ${selected ? 'border-red-500 bg-red-500 text-white' : 'border-white bg-black/30 text-transparent'}`}>
            <Check className="h-3.5 w-3.5" />
          </span>
        </button>
      )}
    </div>
  );
}

type BarProps = {
  count: number; total: number; busy: boolean; message: string | null;
  onAll: () => void; onClear: () => void; onDelete: () => void;
};

/**
 * Bottom bar while selecting: count, select all / clear, delete with a second tap to confirm.
 * The delete result (and why assets were kept) shows here, since the top of the grid may be scrolled away.
 */
function SelectionBar({ count, total, busy, message, onAll, onClear, onDelete }: BarProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="sticky bottom-0 z-20 mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white/95 px-3 py-2.5 shadow-sm backdrop-blur">
      <span className="text-[13px] font-semibold text-ink tabular-nums">{count} selected</span>
      <button type="button" onClick={count === total ? onClear : onAll} className="text-[12px] font-medium text-muted transition-colors hover:text-ink">
        {count === total ? 'Clear' : `Select all ${total}`}
      </button>
      <button
        type="button"
        disabled={count === 0 || busy}
        onClick={() => (confirming ? (setConfirming(false), onDelete()) : setConfirming(true))}
        onBlur={() => setConfirming(false)}
        className={`ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition-all active:scale-[.97] disabled:opacity-40 ${confirming ? 'border-red-600 bg-red-600 text-white' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        {busy ? 'Deleting…' : confirming ? `Delete ${count}? Tap again` : `Delete ${count}`}
      </button>
      {message && <p role="status" className="basis-full text-[12px] text-red-600">{message}</p>}
    </div>
  );
}

type Props<T extends { id: string }> = {
  section: LibrarySection;
  /** Shown items (already filtered by the search box). */
  items: T[];
  token: string;
  gridClassName: string;
  /** "+ Add" card, hidden while selecting. */
  addCard?: React.ReactNode;
  renderItem: (item: T) => React.ReactNode;
  onRemoved: (ids: string[]) => void;
  /** Extra content under the grid (e.g. "Load more"). */
  footer?: React.ReactNode;
  /** Lets the parent show its own errors (e.g. a failed "Load more") in the status line. */
  message?: string | null;
};

export function LibrarySelectGrid<T extends { id: string }>(props: Props<T>) {
  const { section, items, token, gridClassName, addCard, renderItem, onRemoved, footer, message } = props;
  const [selecting, setSelecting] = useState(false);
  const bulk = useBulkDelete(token, section, onRemoved);

  const stopSelecting = () => {
    setSelecting(false);
    bulk.setSelected(new Set());
    bulk.setMessage(null);
  };
  const status = bulk.message ?? message;

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={selecting ? stopSelecting : () => setSelecting(true)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[12px] font-medium text-ink transition-colors hover:border-red-300 hover:text-red-600"
        >
          {selecting ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          {selecting ? 'Done' : 'Select'}
        </button>
        {status && !selecting && <p role="status" className="text-[12px] text-muted">{status}</p>}
      </div>

      <div className={gridClassName}>
        {!selecting && addCard}
        {items.map((item) => (
          <SelectableCard key={item.id} selecting={selecting} selected={bulk.selected.has(item.id)} onToggle={() => bulk.toggle(item.id)}>
            {renderItem(item)}
          </SelectableCard>
        ))}
      </div>

      {footer}

      {selecting && (
        <SelectionBar
          count={bulk.selected.size}
          total={items.length}
          busy={bulk.busy}
          message={status ?? null}
          onAll={() => bulk.setSelected(new Set(items.map((i) => i.id)))}
          onClear={() => bulk.setSelected(new Set())}
          onDelete={() => void bulk.remove()}
        />
      )}
    </div>
  );
}
