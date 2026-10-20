'use client';

import { useEffect, useState } from 'react';
import { isNumbered, numberCards } from '../../../../types/admin/campaignNumbering';
import { titlePick, type TextAt } from '../../../../types/slideText';
import { linkedTextCards, MIN_CAMPAIGN_CONTENT, targetsCard, type CampaignCard, type CampaignDraft, type CampaignLookRole, type CampaignPhotoTarget } from '../../../../types/admin/slideshowCampaign';
import { isAdminView } from '../../../../lib/adminToken';
import { adminFetch } from '../../business/useAdminApi';
import { LookMenu } from '../LookMenu';
import { announceCreditsChanged, CREDITS_HINT } from '../creditsEvents';
import { SettingsModal } from '../settings/SettingsModal';
import { useCheckoutReturn } from '../settings/credits/useCheckoutReturn';
import { SafeZoneButton, useSafeZone } from '../SafeZone';
import { GenerateVideoButton } from '../VideoButton';
import { EditorAlert, EditorAside, EditorBody, EditorFrame, EditorPlaceholder, editorCard, topBarButton } from '../editor/EditorShell';
import { RoleTabBar } from '../editor/RoleTabBar';
import { SlideDeleteButton } from '../SlideDeleteButton';
import { TextLockButton } from '../TextLockButton';
import { playerAudio, SlideshowMusic, useMusicTracks } from '../SlideshowMusic';
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
import { useCampaign, type PendingPhoto } from './useCampaign';
import { useCampaignVideo } from './useCampaignVideo';
import { useGenerateAll } from './useGenerateAll';
import { ScheduleButton } from './ScheduleButton';
import { useCampaignSchedule } from './useCampaignSchedule';

type Props = { token: string; workspaceId: string; campaignId: string; onClose: () => void };

/** The slides (0 = hook, i = card i - 1) whose shown photo is on its way: a card's photo being replaced, or the first
 *  photo of an empty hook or card. Photos added to a rotation behind a shown one change nothing on screen. */
const loadingSlides = (pending: PendingPhoto[], draft: CampaignDraft | undefined): Set<number> =>
  new Set(
    pending.flatMap(({ target: t }) => {
      if (t.slot === 'hook') return draft?.hookPhotos.length && t.replace !== 0 ? [] : [0];
      if (t.slot === 'cards') return t.cards.map((c) => c + 1);
      if (t.slot === 'cardRotation' && draft?.cards[t.card]?.photo != null) return [];
      return [t.card + 1];
    }),
  );

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
  const generateAll = useGenerateAll(token, campaignId, state, auto);
  const video = useCampaignVideo(token, campaignId, state);
  const plan = useCampaignSchedule(token, state);
  /** Video render is admin-only: the admin token, or an "Open as user" tab. */
  const admin = isAdminView(token);
  const safeZone = useSafeZone();
  const tracks = useMusicTracks(token);
  const [addingCredit, setAddingCredit] = useState(false);
  const needsCredit = state.error?.endsWith(CREDITS_HINT) ?? false;
  /** Back from Stripe (checkout opened from Add Credit): confirms the payment here, no Settings popup. */
  const paid = useCheckoutReturn(token, () => {
    announceCreditsChanged();
    state.clearError();
  });
  const [paidSeen, setPaidSeen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !picker && previewing === null && !addingCredit && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, picker, previewing, addingCredit]);

  const draft = campaign?.draft;
  const loading = loadingSlides(state.pending, draft);
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
    setDraft((d) => {
      // A new slide is locked: its text starts where the other locked content slides' text sits.
      const at = d.cards.find((c) => c.role === 'item' && !c.textFree)?.textAt;
      const card: CampaignCard = { role: 'item', title: '', body: '', photo: null, ...(at ? { textAt: at } : {}) };
      return withCards(d, [...d.cards.slice(0, -1), card, d.cards[d.cards.length - 1]!]);
    });
    setSlide(draft ? draft.cards.length : 1);
  };
  /** Slide i's text dragged to `at` (undefined: back to its usual spot). Slide 0 is the hook, on every hook photo; a
   *  locked content slide moves every locked content slide's text with it. */
  const moveText = (i: number, at: TextAt | undefined) =>
    setDraft((d) => {
      if (i === 0) return { ...d, hookTextAt: at };
      const linked = new Set(linkedTextCards(d.cards, i - 1));
      return { ...d, cards: d.cards.map((c, j) => (linked.has(j) ? { ...c, textAt: at } : c)) };
    });
  /** Content slides' text lock on the strip, once there are two content slides to lock together. */
  const textLock = (i: number) => {
    const card = draft?.cards[i - 1];
    if (!draft || !card || card.role !== 'item' || draft.cards.length - 1 < 2) return null;
    return <TextLockButton locked={!card.textFree} onToggle={() => patchCard(i - 1, { textFree: card.textFree ? undefined : true })} />;
  };
  /** Content slides' bin, under their picture in the strip. */
  const deleteControl = (i: number) => {
    const card = draft?.cards[i - 1];
    if (!draft || !card || card.role !== 'item') return null;
    const contentCount = draft.cards.length - 1;
    return <SlideDeleteButton number={i + 1} onDelete={() => removeCard(i - 1)} disabled={contentCount <= MIN_CAMPAIGN_CONTENT} reason="A campaign needs at least one content slide" />;
  };
  /** Slide i's store badge row dragged to `y` (undefined: back to its usual spot). Only the CTA has badges. */
  const moveBadges = (i: number, y: number | undefined) => {
    if (i > 0) patchCard(i - 1, { badgesAt: y });
  };
  /** Hooks typed by hand have no photo search yet: one is written from them and kept in the draft. */
  const writeHookQuery = async (hooks: string[]): Promise<string> => {
    const { photoQuery } = await adminFetch<{ photoQuery: string }>(token, `/api/slideshow/campaigns/${campaignId}/photo-query`, { method: 'POST', body: JSON.stringify({ hooks }) });
    if (photoQuery) setDraft((d) => ({ ...d, hookPhotoQuery: photoQuery }));
    return photoQuery;
  };
  const removeCard = (i: number) => {
    setDraft((d) => withCards(d, d.cards.filter((_, j) => j !== i)));
    // Slide i + 1 went: the slides after it move back one, and the deleted one's place goes to the slide before it.
    setSlide((s) => (s > i + 1 ? s - 1 : s === i + 1 ? Math.max(1, s - 1) : s));
  };

  const header = (
    <>
      <span className="hidden text-xs text-white/40 sm:block" aria-live="polite">{state.saving ? 'Saving…' : campaign ? 'Saved' : ''}</span>
      {campaign && <SafeZoneButton on={safeZone.on} onToggle={safeZone.toggle} />}
      {campaign && (
        <button type="button" onClick={() => setPreviewing(0)} aria-label="Preview" className={topBarButton}>
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
          <span className="max-sm:hidden">Preview</span>
        </button>
      )}
      {draft && <ScheduleButton plan={plan} />}
    </>
  );

  return (
    <EditorFrame
      label={campaign?.name ?? 'Campaign'}
      backLabel="Back to campaigns"
      onBack={onClose}
      title={
        <>
          {campaign ? <NameInput value={campaign.name} onSave={(n) => void state.rename(n)} /> : <div className="h-11 w-full max-w-xs animate-pulse rounded-xl bg-white/10" />}
          {campaign && <CampaignMenu token={token} campaignId={campaignId} onDeleted={onClose} />}
        </>
      }
      actions={header}
    >
      {!campaign || !draft ? (
        <EditorPlaceholder error={state.error} />
      ) : (
        <EditorBody
          player={
            <>
              <CampaignPlayer draft={draft} photos={campaign.photos} index={at} onIndex={setSlide} onMoveText={moveText} onMoveBadges={moveBadges} safeZone={safeZone.on} loading={loading} audio={playerAudio(draft.audioAssetId, tracks)} />
              <SlideshowMusic compact value={draft.audioAssetId ?? null} tracks={tracks} onPick={(id) => setDraft((d) => ({ ...d, audioAssetId: id ?? undefined }))} />
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
            </>
          }
          strip={<CampaignStrip draft={draft} photos={campaign.photos} index={at} onPick={pickSlide} onAdd={addCard} onMoveText={moveText} onMoveBadges={moveBadges} loading={loading} corner={textLock} footer={deleteControl} />}
          main={
            <>
              <section aria-label="Slide" className={editorCard}>
                <RoleTabBar
                  active={tab}
                  onPick={(role) => setSlide(role === 'hook' ? 0 : role === 'content' ? 1 : draft.cards.length)}
                  after={tab === 'content' && contentMode === 'slides' && <span className="text-xs text-white/40">Slide {at + 1}</span>}
                  end={
                    <LookMenu
                      label="Title style"
                      scope={STYLE_SCOPE[tab]}
                      align="right"
                      active={titlePick(TAB_ROLE[tab], draft.looks[tab])}
                      onPick={(look) => setDraft((d) => ({ ...d, looks: { ...d.looks, [tab]: look } }))}
                    />
                  }
                />
                {paid && !paidSeen && !state.error && (
                  <p role="status" className={`mb-4 flex items-start gap-2 rounded-lg p-3 text-sm ${paid.tone === 'ok' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/5 text-white/70'}`}>
                    <span className="flex-1">{paid.text}</span>
                    <button type="button" onClick={() => setPaidSeen(true)} aria-label="Dismiss">✕</button>
                  </p>
                )}
                {state.error && (
                  <EditorAlert
                    message={needsCredit ? state.error.slice(0, -CREDITS_HINT.length) : state.error}
                    onDismiss={state.clearError}
                    action={needsCredit && (
                      <button type="button" onClick={() => setAddingCredit(true)} className="min-h-9 shrink-0 rounded-full bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 shadow-sm transition active:scale-95">Add Credit</button>
                    )}
                  />
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
                  <HookPanel token={token} campaignId={campaignId} draft={draft} photos={campaign.photos} pending={state.pending.filter((p) => p.target.slot === 'hook')} onChange={setDraft} onAddPhotos={() => setPicker({ slot: 'hook' })} onReplacePhoto={(i) => setPicker({ slot: 'hook', replace: i })} onGenerateAll={generateAll} />
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
            </>
          }
          aside={
            <EditorAside title="Post and Schedule">
              <CampaignPosts state={state} plan={plan} onPreview={setPreviewing} />
            </EditorAside>
          }
        />
      )}
      {picker && campaign && (
        <PhotoLibraryDialog
          token={token}
          workspaceId={workspaceId}
          campaignId={campaignId}
          multiple={(picker.slot === 'hook' && picker.replace === undefined) || picker.slot === 'cardRotation'}
          title={picker.slot === 'hook' ? 'Hook photos' : picker.slot === 'cardRotation' ? 'Slide photos' : 'Slide photo'}
          recommended={picker.slot === 'hook' && picker.replace === undefined && draft ? draft.hooks.length - draft.hookPhotos.length - state.pending.filter((p) => p.target.slot === 'hook').length : 0}
          startTab={picker.slot === 'card' && draft?.cards[picker.card]?.role === 'cta' ? 'appshot' : 'search'}
          chooseForMe={picker.slot === 'hook' && picker.replace === undefined && draft ? { query: draft.hookPhotoQuery ?? '', count: draft.hooks.length, writeQuery: () => writeHookQuery(draft.hooks) } : undefined}
          onClose={() => setPicker(null)}
          onDone={(picks) => {
            setPicker(null);
            void state.importPhotos(picks, picker);
          }}
        />
      )}
      {addingCredit && <SettingsModal token={token} workspaceId={workspaceId} initialTab="credits" onClose={() => setAddingCredit(false)} />}
      {previewing !== null && campaign && draft && (
        <CampaignPreview {...previewShows(draft, campaign.photos, campaign.slideshows, state.stale)} startShow={previewing} onClose={() => setPreviewing(null)} />
      )}
    </EditorFrame>
  );
}
