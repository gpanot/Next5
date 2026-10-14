'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { isNumbered, numberCards } from '../../../../types/admin/campaignNumbering';
import { titlePick, type TextAt } from '../../../../types/slideText';
import { targetsCard, type CampaignCard, type CampaignDraft, type CampaignLookRole, type CampaignPhotoTarget } from '../../../../types/admin/slideshowCampaign';
import { isAdminView } from '../../../../lib/adminToken';
import { LookMenu } from '../LookMenu';
import { SafeZoneButton, useSafeZone } from '../SafeZone';
import { GenerateVideoButton } from '../VideoButton';
import { CampaignPlayer } from './CampaignPlayer';
import { CampaignPosts } from './CampaignPosts';
import { CampaignPreview } from './CampaignPreview';
import { AutoContentPanel } from './AutoContentPanel';
import { CampaignStrip } from './CampaignStrip';
import { CardPanel } from './CardPanel';
import { CampaignMenu } from './CampaignMenu';
import { Checklist, ContentModeTabs, NameInput, type ContentMode } from './EditorParts';
import { HookPanel } from './HookPanel';
import { PhotoLibraryDialog } from './PhotoLibraryDialog';
import { previewShows } from './previewSlides';
import { useAutoContent } from './useAutoContent';
import { useCampaign } from './useCampaign';
import { useCampaignVideo } from './useCampaignVideo';
import { ScheduleButton } from './ScheduleButton';
import { useCampaignSchedule } from './useCampaignSchedule';

type Props = { token: string; workspaceId: string; campaignId: string; onClose: () => void };

const card = 'rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-sm';
const tabClass = (on: boolean) => `min-h-10 rounded-lg px-4 text-sm font-semibold transition active:scale-95 ${on ? 'bg-emerald-400 text-zinc-950' : 'text-white/60 hover:text-white'}`;

/** Slide 0 is the hook; slide i >= 1 is card i - 1 (the CTA last). */
const roleTab = (draft: CampaignDraft, slide: number): CampaignLookRole => (slide === 0 ? 'hook' : slide === draft.cards.length ? 'cta' : 'content');

/** The slide role a tab's text style is drawn for. */
const TAB_ROLE: Record<CampaignLookRole, 'hook' | 'item' | 'cta'> = { hook: 'hook', content: 'item', cta: 'cta' };

/** Whom the open tab's text style applies to. */
const STYLE_SCOPE: Record<CampaignLookRole, string> = { hook: 'Hook', content: 'Every content slide', cta: 'CTA' };

/** Auto first while no content slide has a headline; Slide by slide once there is something to edit. */
const startMode = (draft: CampaignDraft | undefined): ContentMode => (draft?.cards.some((c) => c.role === 'item' && c.title.trim()) ? 'slides' : 'auto');

/**
 * The campaign editor, full screen and phone first: the name in the top bar, the slideshow editor's player (left on wide
 * screens), every slide as a card, then the selected slide's panel (hook lines and rotating photos, or one card's text
 * and photo), with Post and Schedule beside it; the Schedule button sits in the top bar. Scheduling makes the slideshows (one per hook) when the slides changed
 * since they were last made.
 */
export function CampaignEditor({ token, workspaceId, campaignId, onClose }: Props) {
  const state = useCampaign(token, campaignId);
  const [slide, setSlide] = useState(0);
  const [picker, setPicker] = useState<CampaignPhotoTarget | null>(null);
  /** The slideshow the preview opens on; null when closed. */
  const [previewing, setPreviewing] = useState<number | null>(null);
  const { campaign, setDraft } = state;
  const [mode, setMode] = useState<ContentMode | null>(null);
  const auto = useAutoContent(token, campaignId, state);
  const video = useCampaignVideo(token, campaignId, state);
  const plan = useCampaignSchedule(token, state);
  /** Video render is admin-only: the admin token, or an "Open as user" tab. */
  const admin = isAdminView(token);
  const safeZone = useSafeZone();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !picker && previewing === null && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, picker, previewing]);

  const draft = campaign?.draft;
  const at = draft ? Math.min(slide, draft.cards.length) : 0;
  const tab = draft ? roleTab(draft, at) : 'hook';
  const contentMode = mode ?? startMode(draft);
  /** A slide picked in the strip opens it; a content slide opens in Slide by slide. */
  const pickSlide = (i: number) => {
    setSlide(i);
    if (draft && roleTab(draft, i) === 'content') setMode('slides');
  };
  const runAuto = async () => {
    const replacing = draft?.cards.some((c) => c.role === 'item' && (c.title.trim() || c.photo !== null));
    if (replacing && !window.confirm('Replace your content slides with new ones?')) return;
    if (await auto.run()) {
      setSlide(1);
      setMode('slides');
    }
  };
  const patchCard = (i: number, patch: Partial<CampaignCard>) => setDraft((d) => ({ ...d, cards: d.cards.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));
  /** The draft with its cards replaced, numbered again when the headlines were numbered. */
  const withCards = (d: CampaignDraft, cards: CampaignCard[]): CampaignDraft => ({ ...d, cards: isNumbered(d.cards) ? numberCards({ hooks: d.hooks, cards }, true) : cards });
  const addCard = () => {
    setDraft((d) => withCards(d, [...d.cards.slice(0, -1), { role: 'item', title: '', body: '', photo: null }, d.cards[d.cards.length - 1]!]));
    setSlide(draft ? draft.cards.length : 1);
  };
  /** Slide i's text dragged to `at` (undefined: back to its usual spot). Slide 0 is the hook, on every hook photo. */
  const moveText = (i: number, at: TextAt | undefined) =>
    setDraft((d) => (i === 0 ? { ...d, hookTextAt: at } : { ...d, cards: d.cards.map((c, j) => (j === i - 1 ? { ...c, textAt: at } : c)) }));
  /** Slide i's store badge row dragged to `y` (undefined: back to its usual spot). Only the CTA has badges. */
  const moveBadges = (i: number, y: number | undefined) => {
    if (i > 0) patchCard(i - 1, { badgesAt: y });
  };
  const removeCard = (i: number) => {
    setDraft((d) => withCards(d, d.cards.filter((_, j) => j !== i)));
    setSlide((s) => Math.max(1, s - 1));
  };

  // On <body>: the workspace page's own layers must never cover the editor or its top bar.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-950 text-white" role="dialog" aria-modal="true" aria-label={campaign?.name ?? 'Campaign'}>
      <header className="flex min-h-16 shrink-0 items-center gap-2 border-b border-white/10 px-2 sm:px-4">
        <button onClick={onClose} aria-label="Back to campaigns" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white/10">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {campaign ? <NameInput value={campaign.name} onSave={(n) => void state.rename(n)} /> : <div className="h-11 w-full max-w-xs animate-pulse rounded-xl bg-white/10" />}
          {campaign && <CampaignMenu token={token} campaignId={campaignId} onDeleted={onClose} />}
        </div>
        <span className="hidden text-xs text-white/40 sm:block" aria-live="polite">{state.saving ? 'Saving…' : campaign ? 'Saved' : ''}</span>
        {campaign && <SafeZoneButton on={safeZone.on} onToggle={safeZone.toggle} />}
        {campaign && (
          <button type="button" onClick={() => setPreviewing(0)} aria-label="Preview" className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-white/15 px-3 text-sm font-semibold text-white/85 transition hover:bg-white/5 active:scale-95 sm:px-4">
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
            <span className="max-sm:hidden">Preview</span>
          </button>
        )}
        {draft && <ScheduleButton plan={plan} />}
      </header>

      {!campaign || !draft ? (
        state.error ? <p className="m-4 rounded-lg bg-red-500/15 p-3 text-sm text-red-300">{state.error}</p> : <div className="m-4 h-72 animate-pulse rounded-xl bg-white/5" />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
          {/* The slideshow editor's player: left on wide screens, on top on phones. */}
          <div className="shrink-0 p-4 md:flex md:w-[30%] md:flex-col md:justify-center md:overflow-y-auto lg:w-[27%]">
            <CampaignPlayer draft={draft} photos={campaign.photos} index={at} onIndex={setSlide} onMoveText={moveText} onMoveBadges={moveBadges} onRemoveCard={removeCard} safeZone={safeZone.on} />
            {admin && (
              <GenerateVideoButton
                rendering={video.rendering}
                startedAt={video.startedAt}
                lastMs={video.lastMs}
                error={video.error}
                disabled={state.busy !== null}
                onClick={() => void video.generate()}
              />
            )}
          </div>
          <div className="min-w-0 md:flex-1 md:overflow-y-auto md:border-l md:border-white/10">
            <div className="border-b border-white/10 bg-black/20 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:16px_16px]">
              <CampaignStrip draft={draft} photos={campaign.photos} index={at} onPick={pickSlide} onAdd={addCard} onMoveText={moveText} onMoveBadges={moveBadges} />
            </div>
            <div className="mx-auto grid max-w-7xl gap-4 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] xl:items-start">
              <div className="min-w-0 space-y-4">
                <section aria-label="Slide" className={card}>
                  <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
                    <div role="tablist" className="flex rounded-xl bg-white/5 p-1">
                      <button type="button" role="tab" aria-selected={tab === 'hook'} onClick={() => setSlide(0)} className={tabClass(tab === 'hook')}>Hook</button>
                      <button type="button" role="tab" aria-selected={tab === 'content'} onClick={() => setSlide(1)} className={tabClass(tab === 'content')}>Content</button>
                      <button type="button" role="tab" aria-selected={tab === 'cta'} onClick={() => setSlide(draft.cards.length)} className={tabClass(tab === 'cta')}>CTA</button>
                    </div>
                    {tab === 'content' && contentMode === 'slides' && <span className="text-xs text-white/40">Slide {at + 1}</span>}
                    <div className="ml-auto">
                      <LookMenu
                        label="Title style"
                        scope={STYLE_SCOPE[tab]}
                        align="right"
                        active={titlePick(TAB_ROLE[tab], draft.looks[tab])}
                        onPick={(look) => setDraft((d) => ({ ...d, looks: { ...d.looks, [tab]: look } }))}
                      />
                    </div>
                  </div>
                  {state.error && (
                    <p role="alert" className="mb-4 flex items-start gap-2 rounded-lg bg-red-500/15 p-3 text-sm text-red-300">
                      <span className="flex-1">{state.error}</span>
                      <button type="button" onClick={state.clearError} aria-label="Dismiss" className="text-red-200">✕</button>
                    </p>
                  )}
                  {tab === 'content' && <ContentModeTabs mode={contentMode} onPick={setMode} />}
                  {tab === 'content' && contentMode === 'auto' ? (
                    <AutoContentPanel
                      draft={draft}
                      settings={auto.settings}
                      writing={auto.writing}
                      photosPending={state.pending.filter((p) => p.key.startsWith('auto-')).length}
                      onChange={auto.update}
                      onRun={() => void runAuto()}
                    />
                  ) : at === 0 ? (
                    <HookPanel token={token} campaignId={campaignId} draft={draft} photos={campaign.photos} pending={state.pending.filter((p) => p.target.slot === 'hook')} onChange={setDraft} onAddPhotos={() => setPicker({ slot: 'hook' })} />
                  ) : (
                    <CardPanel
                      card={draft.cards[at - 1]!}
                      position={at - 1}
                      contentCount={draft.cards.length - 1}
                      photos={campaign.photos}
                      pending={state.pending.find((p) => targetsCard(p.target, at - 1)) ?? null}
                      rotationPending={state.pending.filter((p) => p.target.slot === 'cardRotation' && p.target.card === at - 1)}
                      hookCount={draft.hooks.length}
                      onAddPhotos={() => setPicker({ slot: 'cardRotation', card: at - 1 })}
                      onChange={(p) => patchCard(at - 1, p)}
                      numbered={isNumbered(draft.cards)}
                      onNumbered={(on) => setDraft((d) => ({ ...d, cards: numberCards(d, on) }))}
                      onPickPhoto={() => setPicker({ slot: 'card', card: at - 1 })}
                      onRemove={() => removeCard(at - 1)}
                    />
                  )}
                </section>
                <Checklist draft={draft} />
              </div>
              {/* Right of the slide panel on wide screens, below it on phones. */}
              <aside aria-label="Post and Schedule" className={`${card} xl:sticky xl:top-4`}>
                <h2 className="text-base font-semibold text-white">Post and Schedule</h2>
                <div className="mt-3">
                  <CampaignPosts state={state} plan={plan} onPreview={setPreviewing} />
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}
      {picker && campaign && (
        <PhotoLibraryDialog
          token={token}
          workspaceId={workspaceId}
          campaignId={campaignId}
          multiple={picker.slot === 'hook' || picker.slot === 'cardRotation'}
          title={picker.slot === 'hook' ? 'Hook photos' : picker.slot === 'cardRotation' ? 'Slide photos' : 'Slide photo'}
          startTab={picker.slot === 'card' && draft?.cards[picker.card]?.role === 'cta' ? 'appshot' : 'search'}
          onClose={() => setPicker(null)}
          onDone={(picks) => {
            setPicker(null);
            void state.importPhotos(picks, picker);
          }}
        />
      )}
      {previewing !== null && campaign && draft && (
        <CampaignPreview {...previewShows(draft, campaign.photos, campaign.slideshows, state.stale)} startShow={previewing} onClose={() => setPreviewing(null)} />
      )}
    </div>,
    document.body,
  );
}
