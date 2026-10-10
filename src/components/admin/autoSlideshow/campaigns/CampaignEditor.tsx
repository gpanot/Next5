'use client';

import { useEffect, useState } from 'react';
import { campaignProblems, type CampaignCard, type CampaignDraft, type CampaignPhotoTarget } from '../../../../types/admin/slideshowCampaign';
import { HookStyleOptions } from '../../../labs/blitzLab/HookStyleOptions';
import { adminFetch } from '../../business/useAdminApi';
import { useAutoRun } from '../useAutoRun';
import { CampaignPosts } from './CampaignPosts';
import { CampaignStrip } from './CampaignStrip';
import { CardPanel } from './CardPanel';
import { HookPanel } from './HookPanel';
import { PhotoLibraryDialog } from './PhotoLibraryDialog';
import { useCampaign, type CampaignState } from './useCampaign';

type Props = { token: string; workspaceId: string; campaignId: string; onClose: () => void };

const card = 'rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-sm';
const tabClass = (on: boolean) => `min-h-10 rounded-lg px-4 text-sm font-semibold transition active:scale-95 ${on ? 'bg-emerald-400 text-zinc-950' : 'text-white/60 hover:text-white'}`;

/** Slide 0 is the hook; slide i >= 1 is card i - 1 (the CTA last). */
const roleTab = (draft: CampaignDraft, slide: number) => (slide === 0 ? 'hook' : slide === draft.cards.length ? 'cta' : 'content');

function NameInput({ value, onSave }: { value: string; onSave: (name: string) => void }) {
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

function GenerateButton({ state, onDone }: { state: CampaignState; onDone: () => void }) {
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
      className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-sm transition active:scale-95 disabled:opacity-40 ${primary ? 'bg-emerald-400 text-zinc-950' : 'border border-white/15 text-white/80'}`}
    >
      {busy === 'generate' && <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {label}
    </button>
  );
}

/**
 * The campaign editor, full screen and phone first: the name in the top bar, every slide as a card, then the selected
 * slide's panel (hook lines and rotating photos, or one card's text and photo). "Make" renders one slideshow per hook;
 * they then get their post times below.
 */
export function CampaignEditor({ token, workspaceId, campaignId, onClose }: Props) {
  const state = useCampaign(token, campaignId);
  const run = useAutoRun(token, campaignId);
  const [slide, setSlide] = useState(0);
  const [picker, setPicker] = useState<CampaignPhotoTarget | null>(null);
  const { campaign, setDraft } = state;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !picker && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, picker]);

  const draft = campaign?.draft;
  const at = draft ? Math.min(slide, draft.cards.length) : 0;
  const tab = draft ? roleTab(draft, at) : 'hook';
  const patchCard = (i: number, patch: Partial<CampaignCard>) => setDraft((d) => ({ ...d, cards: d.cards.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));
  const addCard = () => {
    setDraft((d) => ({ ...d, cards: [...d.cards.slice(0, -1), { role: 'item', title: '', body: '', photo: null }, d.cards[d.cards.length - 1]!] }));
    setSlide(draft ? draft.cards.length : 1);
  };
  const removeCard = (i: number) => {
    setDraft((d) => ({ ...d, cards: d.cards.filter((_, j) => j !== i) }));
    setSlide((s) => Math.max(1, s - 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white" role="dialog" aria-modal="true" aria-label={campaign?.name ?? 'Campaign'}>
      <header className="flex min-h-16 shrink-0 items-center gap-2 border-b border-white/10 px-2 sm:px-4">
        <button onClick={onClose} aria-label="Back to campaigns" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white/10">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <div className="min-w-0 flex-1">{campaign ? <NameInput value={campaign.name} onSave={(n) => void state.rename(n)} /> : <div className="h-11 max-w-xs animate-pulse rounded-xl bg-white/10" />}</div>
        <span className="hidden text-xs text-white/40 sm:block" aria-live="polite">{state.saving ? 'Saving…' : campaign ? 'Saved' : ''}</span>
        <GenerateButton state={state} onDone={run.refresh} />
      </header>

      {!campaign || !draft ? (
        state.error ? <p className="m-4 rounded-lg bg-red-500/15 p-3 text-sm text-red-300">{state.error}</p> : <div className="m-4 h-72 animate-pulse rounded-xl bg-white/5" />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-white/10 bg-black/20 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:16px_16px]">
            <CampaignStrip draft={draft} photos={campaign.photos} index={at} onPick={setSlide} onAdd={addCard} />
          </div>
          <div className="mx-auto max-w-4xl space-y-4 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <section aria-label="Slide" className={card}>
              <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
                <div role="tablist" className="flex rounded-xl bg-white/5 p-1">
                  <button type="button" role="tab" aria-selected={tab === 'hook'} onClick={() => setSlide(0)} className={tabClass(tab === 'hook')}>Hook</button>
                  <button type="button" role="tab" aria-selected={tab === 'content'} onClick={() => setSlide(1)} className={tabClass(tab === 'content')}>Content</button>
                  <button type="button" role="tab" aria-selected={tab === 'cta'} onClick={() => setSlide(draft.cards.length)} className={tabClass(tab === 'cta')}>CTA</button>
                </div>
                {tab === 'content' && <span className="text-xs text-white/40">Slide {at + 1}</span>}
              </div>
              {state.error && (
                <p role="alert" className="mb-4 flex items-start gap-2 rounded-lg bg-red-500/15 p-3 text-sm text-red-300">
                  <span className="flex-1">{state.error}</span>
                  <button type="button" onClick={state.clearError} aria-label="Dismiss" className="text-red-200">✕</button>
                </p>
              )}
              {at === 0 ? (
                <HookPanel draft={draft} photos={campaign.photos} importing={state.busy === 'import'} onChange={setDraft} onAddPhotos={() => setPicker({ slot: 'hook' })} />
              ) : (
                <CardPanel
                  card={draft.cards[at - 1]!}
                  position={at - 1}
                  contentCount={draft.cards.length - 1}
                  photos={campaign.photos}
                  importing={state.busy === 'import'}
                  onChange={(p) => patchCard(at - 1, p)}
                  onPickPhoto={() => setPicker({ slot: 'card', card: at - 1 })}
                  onRemove={() => removeCard(at - 1)}
                />
              )}
            </section>
            <section aria-label="Text style" className={`${card} space-y-2`}>
              <p className="text-[11px] font-semibold tracking-widest text-white/50 uppercase">Hook + CTA style</p>
              <HookStyleOptions tone="dark" activeId={draft.look} onPick={(look) => setDraft((d) => ({ ...d, look }))} />
            </section>
            <Checklist draft={draft} />
            {run.run && (state.stale ? <p className="text-sm text-amber-300">You changed the campaign. Tap Make to update the slideshows.</p> : null)}
            {run.run && <div className={card}><CampaignPosts token={token} run={run.run} onChanged={run.refresh} /></div>}
            <DeleteCampaign token={token} campaignId={campaignId} onDeleted={onClose} />
          </div>
        </div>
      )}
      {picker && campaign && (
        <PhotoLibraryDialog
          token={token}
          workspaceId={workspaceId}
          campaignId={campaignId}
          multiple={picker.slot === 'hook'}
          title={picker.slot === 'hook' ? 'Hook photos' : 'Slide photo'}
          onClose={() => setPicker(null)}
          onDone={(refs) => {
            setPicker(null);
            void state.importPhotos(refs, picker);
          }}
        />
      )}
    </div>
  );
}

/** What is left before "Make" works. Hidden once the draft is ready. */
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

/** Deletes the campaign with its slideshows; their scheduled posts are canceled with them. */
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
