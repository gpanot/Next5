'use client';

import { useState } from 'react';
import { campaignProblems, type CampaignDraft } from '../../../../types/admin/slideshowCampaign';
import { adminFetch } from '../../business/useAdminApi';

export function NameInput({ value, onSave }: { value: string; onSave: (name: string) => void }) {
  const [text, setText] = useState(value);
  const commit = () => text.trim() && text.trim() !== value && onSave(text.trim());
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      maxLength={80}
      aria-label="Campaign name"
      className="min-h-11 w-full min-w-0 rounded-xl border border-white/15 bg-white/5 px-3 text-base font-semibold text-white focus:border-emerald-400 focus:outline-none sm:max-w-xs"
    />
  );
}

/** What is left before the campaign can be scheduled. Hidden once the draft is ready. */
export function Checklist({ draft }: { draft: CampaignDraft }) {
  const problems = campaignProblems(draft);
  if (problems.length === 0) return null;
  return (
    <section aria-label="Before you schedule" className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
      <p className="mb-2 text-sm font-semibold text-amber-200">Before you schedule</p>
      <ul className="space-y-1 text-sm text-amber-100/80">
        {problems.slice(0, 5).map((p) => <li key={p}>· {p}</li>)}
        {problems.length > 5 && <li>· and {problems.length - 5} more</li>}
      </ul>
    </section>
  );
}

/** Deletes the campaign with its slideshows; their scheduled posts are canceled with them. */
export function DeleteCampaign({ token, campaignId, onDeleted }: { token: string; campaignId: string; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const remove = async () => {
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
    <button type="button" onClick={() => void remove()} disabled={busy} className="min-h-11 rounded-full px-4 text-sm font-medium text-red-300 transition hover:bg-red-500/10 active:scale-95 disabled:opacity-40">
      {busy ? 'Deleting…' : 'Delete campaign'}
    </button>
  );
}
