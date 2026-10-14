'use client';

import { useEffect, useRef, useState } from 'react';
import { adminFetch } from '../../business/useAdminApi';

type Props = { token: string; campaignId: string; onDeleted: () => void };

function DotsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

/**
 * The ⋯ menu beside the campaign name, so Delete is never one stray tap away. Deleting removes the campaign with its
 * slideshows; their scheduled posts are canceled with them.
 */
export function CampaignMenu({ token, campaignId, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const remove = async () => {
    setOpen(false);
    if (!window.confirm('Delete this campaign? Its slideshows and scheduled posts go too. This cannot be undone.')) return;
    setBusy(true);
    try {
      await adminFetch(token, `/api/slideshow/campaigns/${campaignId}`, { method: 'DELETE' });
      onDeleted();
    } catch {
      setBusy(false);
    }
  };

  return (
    <div ref={root} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        aria-label="Campaign options"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-40"
      >
        <DotsIcon />
      </button>
      {open && (
        <div role="menu" className="absolute top-full left-0 z-10 mt-1 min-w-48 overflow-hidden rounded-xl border border-white/10 bg-zinc-900 p-1 shadow-sm">
          <button type="button" role="menuitem" onClick={() => void remove()} className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium text-red-300 transition hover:bg-red-500/10">
            Delete campaign
          </button>
        </div>
      )}
    </div>
  );
}
