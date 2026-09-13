'use client';

import { Copy, Lock } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { AppButton } from '../../ui/AppButton';
import { Textarea } from '../../ui/Textarea';

type CaptionPanelProps = { itemId: string; initial: string | null; allowed: boolean; onCopied: () => void };

export const CaptionPanel = ({ itemId, initial, allowed, onCopied }: CaptionPanelProps) => {
  const [caption, setCaption] = useState(initial ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!allowed) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-[13px] text-white/80">
        <Lock aria-hidden className="h-4 w-4" /> Ready-to-post captions are included in Pro. <Link href="/app/billing" className="font-medium text-white underline">Upgrade</Link>
      </p>
    );
  }

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ caption: string }>(`/api/app/items/${itemId}/caption`, { method: 'POST' });
      setCaption(res.caption);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not write a caption.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-white/95 p-3 text-[#1f1c19]">
      {caption ? <Textarea rows={3} value={caption} onChange={(e) => setCaption(e.target.value)} aria-label="Caption" /> : <p className="text-[13px] text-[#6b635a]">Get a ready-to-post caption for this photo.</p>}
      {error && <p className="text-[12px] text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        {!caption && <AppButton size="sm" loading={busy} onClick={generate}>Write caption</AppButton>}
        {caption && <AppButton size="sm" variant="secondary" iconLeft={<Copy className="h-3.5 w-3.5" />} onClick={async () => { await navigator.clipboard.writeText(caption); onCopied(); }}>Copy</AppButton>}
      </div>
    </div>
  );
};
