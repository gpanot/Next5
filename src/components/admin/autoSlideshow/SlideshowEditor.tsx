'use client';

import { useEffect, useState } from 'react';
import { isAdminView } from '../../../lib/adminToken';
import { isContentSlide, type AutoPhotoDto, type AutoSlideshowDto, type AutoTrackDto } from '../../../types/admin/autoSlideshow';
import { CaptionPanel, SaveCaptionButton } from './CaptionPanel';
import { SchedulePanel } from './posting/SchedulePanel';
import { useSlideshowSchedule } from './posting/useSlideshowSchedule';
import { ScheduleButton } from './campaigns/ScheduleButton';
import { PlayerControls } from './SlidePlayer';
import { SlidePreview } from './SlidePreview';
import { photosInSlideOrder } from './photoOrder';
import { PhotoPicker } from './PhotoPicker';
import { SafeZoneButton, useSafeZone } from './SafeZone';
import { PhotoToggle, SlideEditPanel } from './SlideEditPanel';
import { roleGroup, SlideStrip } from './SlideStrip';
import { TextLockButton } from './TextLockButton';
import { TextStyleMenu } from './TextStyleMenu';
import { RenderedTextOverlay } from './slideText/RenderedTextOverlay';
import type { SlideTextProps } from './slideText/SlideTextView';
import { SlideshowMenu } from './SlideshowMenu';
import { GenerateVideoButton } from './VideoButton';
import { EditorAlert, EditorAside, EditorBody, EditorFrame, editorCard } from './editor/EditorShell';
import { RoleTabBar, type EditorRole } from './editor/RoleTabBar';
import { parseTags, useSlideshowDrafts } from './useSlideshowDrafts';
import { useSlideshowEdit } from './useSlideshowEdit';
import { useSlideshowVideo } from './useSlideshowVideo';
import { useLiveEdits } from './useLiveEdits';

type Props = {
  token: string;
  runId: string;
  initial: AutoSlideshowDto;
  photos: AutoPhotoDto[] | null;
  /** Music is hidden for now: kept so callers need no change when it comes back. */
  tracks: AutoTrackDto[] | null;
  onChanged: () => void;
  onPhotosChanged: () => void;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  /** The brand's headline box colors, so text dragged on a slide looks as it will render. */
  box?: SlideTextProps['box'];
  /** The Calendar's next empty slot: where Schedule starts when the slideshow has no spot yet. */
  nextSlot?: Date | null;
};

const ghostButton = 'min-h-11 rounded-full px-3 text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-30';

const ROLE_OF: Record<ReturnType<typeof roleGroup>, EditorRole> = { Hook: 'hook', Content: 'content', CTA: 'cta' };

/**
 * A Brand Cast slideshow's editor, on the same frame as the campaign editor (phone first): the player (left on
 * wide screens), every slide as a card, the on-screen slide's Hook · Content · CTA panel with its text, photo and style,
 * and Post and Schedule (caption, then its day and time; Schedule in the top bar) beside it.
 */
export function SlideshowEditor({ token, runId, initial, photos, onChanged, onPhotosChanged, onClose, onPrev, onNext, box, nextSlot = null }: Props) {
  const edit = useSlideshowEdit(token, runId, initial, onChanged);
  const { show, busy } = edit;
  const [slide, setSlide] = useState(0);
  const video = useSlideshowVideo(token, runId, initial.id);
  const current = show.slides[Math.min(slide, show.slides.length - 1)];
  const drafts = useSlideshowDrafts(show, slide);
  const saving = busy === 'caption' || busy === `slide-${slide}`;
  const [photoOpen, setPhotoOpen] = useState(false);
  /** Video render is admin-only: the admin token, or an "Open as user" tab. */
  const admin = isAdminView(token);
  const safeZone = useSafeZone();
  /** `initial` is read again with the run, so a spot saved here or moved on the Calendar shows. */
  const plan = useSlideshowSchedule({ token, runId, show: initial, nextSlot, onSaved: onChanged });

  useEffect(() => {
    /** Escape in a text field (slide text, caption) only leaves the field; elsewhere it closes the editor. */
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) e.target.blur();
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /** Stores the slide text and the caption, whichever changed. */
  const save = async () => {
    if (drafts.textDirty) {
      if (!(await edit.saveSlide(slide, { title: drafts.title, body: drafts.body }))) return;
      drafts.clearText();
    }
    if (drafts.captionDirty && (await edit.saveCaption(drafts.caption, parseTags(drafts.tags)))) drafts.clearCaption();
  };

  const saveCaption = async () => {
    if (await edit.saveCaption(drafts.caption, parseTags(drafts.tags))) drafts.clearCaption();
  };

  const rewrite = async () => {
    if (await edit.regenerate()) {
      drafts.clearText();
      drafts.clearCaption();
    }
  };

  const removeSlide = async () => {
    if (!window.confirm(`Delete slide ${slide + 1}? This cannot be undone.`)) return;
    if (await edit.deleteSlide(slide)) {
      drafts.clearText();
      setSlide((i) => Math.min(i, show.slides.length - 2));
    }
  };

  /** Dropped text and new text styles: shown on the slides at once, while they render again in the background. */
  const live = useLiveEdits(show.slides, edit);
  /** `quiet`: the big preview, where the movable text has no dashed outline until dragged. */
  const textLayer = (i: number, quiet = false) => {
    const s = live.slideAt(i);
    const pending = live.edits[i] ?? null;
    if (!s || (!pending && (i !== slide || busy !== null))) return null;
    return (
      <RenderedTextOverlay
        slide={s}
        photoUrl={photos?.find((p) => p.index === s.photoIndex)?.url ?? null}
        box={box}
        live={pending}
        movable={i === slide}
        quiet={quiet}
        onMove={(at) => live.move(i, at)}
      />
    );
  };

  /** Content slides' text lock, once there are two content slides to lock together. */
  const contentCount = show.slides.filter(isContentSlide).length;
  const textLock = (i: number) => {
    const s = show.slides[i];
    if (!s || !isContentSlide(s) || contentCount < 2) return null;
    return <TextLockButton locked={!s.textFree} onToggle={() => edit.setTextFree(i, !s.textFree)} />;
  };

  const remove = async () => {
    if (!window.confirm('Delete this slideshow? This cannot be undone.')) return;
    if (await edit.remove()) onClose();
  };

  const roles = show.slides.map((s) => ROLE_OF[roleGroup(s.role)]);
  const role = roles[slide] ?? 'hook';
  /** A tab jumps to the first slide of its kind (staying put when already on one). */
  const pickRole = (r: EditorRole) => r !== role && setSlide(Math.max(0, roles.indexOf(r)));

  const actions = (
    <>
      <SafeZoneButton on={safeZone.on} onToggle={safeZone.toggle} />
      <button
        onClick={() => void save()}
        disabled={busy !== null || !drafts.dirty || !drafts.valid}
        className={`flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition active:scale-95 ${
          drafts.dirty ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'bg-white/10 text-white/40'
        } disabled:active:scale-100 ${drafts.dirty && !saving ? 'disabled:opacity-50' : ''}`}
      >
        {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}
        {saving ? 'Saving…' : 'Save'}
      </button>
      <ScheduleButton plan={plan} />
      <button onClick={onPrev} disabled={!onPrev || busy !== null} aria-label="Previous slideshow" className={ghostButton}>‹</button>
      <button onClick={onNext} disabled={!onNext || busy !== null} aria-label="Next slideshow" className={ghostButton}>›</button>
    </>
  );

  const player = (
    <>
      <SlidePreview show={{ ...show, audio: null }} index={slide} onIndex={setSlide} working={busy !== null && !['caption', 'delete', 'music'].includes(busy)} textLayer={(i) => textLayer(i, true)} safeZone={safeZone.on} />
      <PlayerControls count={show.slides.length} index={slide}>
        <button
          onClick={() => void removeSlide()}
          disabled={busy !== null || show.slides.length <= 2}
          aria-label={`Delete slide ${slide + 1}`}
          title={show.slides.length <= 2 ? 'A slideshow needs at least 2 slides' : `Delete slide ${slide + 1}`}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/60 transition hover:bg-red-500/15 hover:text-red-300 active:scale-95 disabled:opacity-30"
        >
          {busy === `delete-slide-${slide}` ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
            </svg>
          )}
        </button>
      </PlayerControls>
      {admin && (
        <GenerateVideoButton
          rendering={video.rendering}
          startedAt={video.startedAt}
          lastMs={video.lastMs}
          disabled={busy !== null || show.slides.some((s) => !s.imageUrl)}
          onClick={() => void video.download()}
        />
      )}
    </>
  );

  const panel = current && (
    <section aria-label="Slide" className={editorCard}>
      <RoleTabBar
        active={role}
        onPick={pickRole}
        missing={(['hook', 'content', 'cta'] as const).filter((r) => !roles.includes(r))}
        after={<span className="text-xs text-white/40">Slide {slide + 1}</span>}
        end={
          <>
            <PhotoToggle open={photoOpen} onClick={() => setPhotoOpen((o) => !o)} />
            <SlideshowMenu disabled={video.rendering || busy !== null} busy={busy} onRewrite={() => void rewrite()} onDelete={() => void remove()} />
          </>
        }
      />
      {(edit.error ?? video.error) && <EditorAlert message={(edit.error ?? video.error)!} />}
      <SlideEditPanel
        slide={current}
        index={slide}
        title={drafts.title}
        body={drafts.body}
        onTitle={drafts.setTitle}
        onBody={drafts.setBody}
        photoOpen={photoOpen}
        photoPicker={
          <PhotoPicker
            slide={current}
            index={slide}
            photos={photos && photosInSlideOrder(show.id, show.slides, photos)}
            busy={busy}
            onPhoto={(photoIndex) => void edit.saveSlide(slide, { photoIndex })}
            onNewPhoto={() => void edit.newPhoto(slide).then((ok) => ok && onPhotosChanged())}
          />
        }
        titleStyle={<TextStyleMenu slide={live.slideAt(slide) ?? current} part="look" onPick={live.style} />}
        bodyStyle={<TextStyleMenu slide={live.slideAt(slide) ?? current} part="bodyLook" onPick={live.style} />}
      />
    </section>
  );

  return (
    <EditorFrame
      label={show.topic}
      backLabel="Close"
      onBack={onClose}
      title={
        <div className="min-w-0 px-1">
          <p className="truncate text-sm font-semibold">{show.topic}</p>
          <p className="truncate text-[11px] text-white/50">{show.modelName} · {slide + 1}/{show.slides.length}</p>
        </div>
      }
      actions={actions}
    >
      <EditorBody
        player={player}
        strip={<SlideStrip slides={show.slides} index={slide} busy={busy} onPick={setSlide} textLayer={(i) => textLayer(i)} corner={textLock} />}
        main={panel}
        aside={
          <EditorAside title="Post and Schedule">
            {/* Caption, then when it posts (as in a campaign). TikTok picks the music itself, so there is no music choice here. */}
            <div className="space-y-6">
              <div className="space-y-3">
                <CaptionPanel caption={drafts.caption} tags={drafts.tags} onCaption={drafts.setCaption} onTags={drafts.setTags} />
                {drafts.captionDirty && <SaveCaptionButton saving={busy === 'caption'} onSave={() => void saveCaption()} />}
              </div>
              <div className="border-t border-white/10 pt-4">
                <SchedulePanel plan={plan} ready={initial.status === 'ready'} />
              </div>
            </div>
          </EditorAside>
        }
      />
    </EditorFrame>
  );
}
