'use client';

import { useState } from 'react';
import { campaignProblems, type CampaignDraft } from '../../../../types/admin/slideshowCampaign';
import { adminFetch } from '../../business/useAdminApi';
import type { CampaignState } from './useCampaign';

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

/** "Make": renders one slideshow per hook. Primary until made, and again after a change. */
export function GenerateButton({ state, onDone, wide }: { state: CampaignState; onDone: () => void; wide?: boolean }) {
  const { campaign, busy, stale } = state;
  if (!campaign) return null;
  const n = campaign.draft.hooks.length;
  const made = campaign.slideshows.length > 0;
  const blocked = campaignProblems(campaign.draft).length > 0;
  const label = busy === 'generate' ? 'Making…' : made && !stale ? 'Make again' : n > 0 ? `Make ${n} ${n === 1 ? 'slideshow' : 'slideshows'}` : 'Make slideshows';
  const primary = !made || stale;
  return (
    <button
      type="button"
      onClick={() => void state.generate().then((ok) => ok && onDone())}
      disabled={busy !== null || blocked}
      className={`flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-4 ${wide ? 'w-full' : ''} text-sm font-semibold shadow-sm transition active:scale-95 disabled:opacity-40 ${primary ? 'bg-emerald-400 text-zinc-950' : 'border border-white/15 text-white/80'}`}
    >
      {busy === 'generate' && <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {label}
    </button>
  );
}

export /** What is left before "Make" works. Hidden once the draft is ready. */
function Checklist({ draft }: { draft: CampaignDraft }) {
  const problems = campaignProblems(draft);
  if (problems.length === 0) return null;
  return (
    <section aria-label="Before you make slideshows" className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
      <p className="mb-2 text-sm font-semibold text-amber-200">Before you make slideshows</p>
      <ul className="space-y-1 text-sm text-amber-100/80">
        {problems.slice(0, 5).map((p) => <li key={p}>· {p}</li>)}
        {problems.length > 5 && <li>· and {problems.length - 5} more</li>}
      </ul>
    </section>
  );
}

export /** Deletes the campaign with its slideshows; their scheduled posts are canceled with them. */
function DeleteCampaign({ token, campaignId, onDeleted }: { token: string; campaignId: string; onDeleted: () => void }) {
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
