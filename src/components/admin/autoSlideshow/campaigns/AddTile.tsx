'use client';

/** The grid's first cell: a blank 9:16 card that starts a new campaign or new slideshows. */
export function AddTile({ label, busy = false, onAdd }: { label: string; busy?: boolean; onAdd: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onAdd}
        disabled={busy}
        className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-app-line bg-app-panel/40 text-sm font-semibold text-app-muted transition hover:border-app-muted hover:text-app-ink active:scale-[0.98] disabled:opacity-50"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
        {busy ? 'Creating…' : label}
      </button>
    </li>
  );
}
