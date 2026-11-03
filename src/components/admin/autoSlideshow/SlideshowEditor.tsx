'use client';

import { useEffect, useState } from 'react';
import { isAdminView } from '../../../lib/adminToken';
import { isContentSlide, type AutoPhotoDto, type AutoSlideshowDto, type AutoTrackDto } from '../../../types/admin/autoSlideshow';
import { CaptionPanel } from './CaptionPanel';
import { SchedulePanel } from './posting/SchedulePanel';
import { useSlideshowSchedule } from './posting/useSlideshowSchedule';
import { ScheduleButton } from './campaigns/ScheduleButton';
import { PlayerControls } from './SlidePlayer';
import { SlidePreview } from './SlidePreview';
import { photosForPicker } from './photoOrder';
import { NewPhotoDialog } from './NewPhotoDialog';
import { PhotoPicker } from './PhotoPicker';
import { SafeZoneButton, useSafeZone } from './SafeZone';
import { PhotoToggle, SlideEditPanel } from './SlideEditPanel';
import { roleGroup, SlideStrip } from './SlideStrip';
import { TextLockButton } from './TextLockButton';
import { TextSizeMenu } from './TextSizeMenu';
import { TextStyleMenu } from './TextStyleMenu';
import { RenderedTextOverlay } from './slideText/RenderedTextOverlay';
import type { SlideTextProps } from './slideText/SlideTextView';
import { SlideDeleteButton } from './SlideDeleteButton';
import { SlideshowMenu } from './SlideshowMenu';
import { SHOW_MUSIC, SlideshowMusic } from './SlideshowMusic';
import { GenerateVideoButton } from './VideoButton';
import { EditorAlert, EditorAside, EditorBody, EditorFrame, editorCard } from './editor/EditorShell';
import { RoleTabBar, type EditorRole } from './editor/RoleTabBar';
import { useSlideshowAutosave } from './useSlideshowAutosave';
import { useSlideshowDrafts } from './useSlideshowDrafts';
import { useSlideshowEdit } from './useSlideshowEdit';
import { useSlideshowVideo } from './useSlideshowVideo';
import { styleGroupOf, useLiveEdits } from './useLiveEdits';

type Props = {
  token: string;
  runId: string;
  initial: AutoSlideshowDto;
  photos: AutoPhotoDto[] | null;
  /** The music picker's tracks (SlideshowMusic: hidden while SHOW_MUSIC is off). */
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
export function SlideshowEditor({ token, runId, initial, photos, tracks, onChanged, onPhotosChanged, onClose, onPrev, onNext, box, nextSlot = null }: Props) {
  const edit = useSlideshowEdit(token, runId, initial, onChanged);
  const { show, busy } = edit;
  const [slide, setSlide] = useState(0);
  const video = useSlideshowVideo(token, runId, initial.id);
  const current = show.slides[Math.min(slide, show.slides.length - 1)];
  const drafts = useSlideshowDrafts(show, slide);
  const [photoOpen, setPhotoOpen] = useState(false);
  /** The slide whose "Generate New" dialog is open. */
  const [newPhotoFor, setNewPhotoFor] = useState<number | null>(null);
  /** Video render is admin-only: the admin token, or an "Open as user" tab. */
  const admin = isAdminView(token);
  const safeZone = useSafeZone();
  /** `initial` is read again with the run, so a spot saved here or moved on the Calendar shows. */
  const plan = useSlideshowSchedule({ token, runId, show: initial, nextSlot, onSaved: onChanged });

  useEffect(() => {
    /** Escape in a text field (slide text, caption) only leaves the field; elsewhere it closes the editor. */
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || newPhotoFor !== null) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) e.target.blur();
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, newPhotoFor]);

  /** Dropped text, new text styles, typed text and picked photos: shown on the slides at once, while they render again in the background. */
  const live = useLiveEdits(show.slides, edit);
  const autosave = useSlideshowAutosave(show, drafts, slide, { text: live.saveText, caption: (caption, tags) => void edit.autosaveCaption(caption, tags) });

  const rewrite = async () => {
    autosave.flush();
    if (await edit.regenerate()) {
      drafts.clearText();
      drafts.clearCaption();
    }
  };

  /** Asked twice by the bin under the slide's picture (SlideDeleteButton). */
  const removeSlide = async (i: number) => {
    autosave.flush();
    if (await edit.deleteSlide(i)) {
      // Slides after it moved up, so a draft kept by number would land on the wrong one.
      drafts.clearText();
      setSlide((s) => (s > i ? s - 1 : Math.min(s, show.slides.length - 2)));
    }
  };

  /** `quiet`: the big preview, where the movable text has no dashed outline until dragged. */
  const textLayer = (i: number, quiet = false) => {
    const typing = i === slide && drafts.textDirty;
    const saved = live.slideAt(i);
    const s = saved && typing ? { ...saved, title: drafts.title, body: drafts.body } : saved;
    const pending = live.edits[i] ?? (typing ? {} : null);
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
  /** Content slides' bin, under their picture in the strip. */
  const deleteControl = (i: number) => {
    const s = show.slides[i];
    if (!s || !isContentSlide(s)) return null;
    return (
      <SlideDeleteButton
        number={i + 1}
        onDelete={() => void removeSlide(i)}
        disabled={busy !== null || show.slides.length <= 2}
        reason="A slideshow needs at least 2 slides"
        working={busy === `delete-slide-${i}`}
      />
    );
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
      <span className="hidden text-xs text-white/40 sm:block" aria-live="polite">{edit.saving || drafts.textDirty || drafts.captionDirty ? 'Saving…' : 'Saved'}</span>
      <ScheduleButton plan={plan} />
      <button onClick={onPrev} disabled={!onPrev || busy !== null} aria-label="Previous slideshow" className={ghostButton}>‹</button>
      <button onClick={onNext} disabled={!onNext || busy !== null} aria-label="Next slideshow" className={ghostButton}>›</button>
    </>
  );

  const player = (
    <>
      <SlidePreview show={SHOW_MUSIC ? show : { ...show, audio: null }} index={slide} onIndex={setSlide} working={busy !== null && !['delete', 'music'].includes(busy)} textLayer={(i) => textLayer(i, true)} safeZone={safeZone.on} />
      <PlayerControls count={show.slides.length} index={slide} />
      <SlideshowMusic compact value={show.audio?.assetId ?? null} recommendedId={show.recommendedAudioId} tracks={tracks} busy={busy !== null} onPick={(id) => void edit.setMusic(id)} />
      {admin && (
        <GenerateVideoButton
          rendering={video.rendering}
          startedAt={video.startedAt}
          lastMs={video.lastMs}
          disabled={busy !== null || edit.saving || show.slides.some((s) => !s.imageUrl)}
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
            <TextSizeMenu
              scope={role === 'content' ? 'Every content slide' : role === 'hook' ? 'Hook' : 'CTA'}
              value={(live.slideAt(slide) ?? current).textSize ?? 1}
              onPick={(size) => live.size(styleGroupOf(current), size)}
            />
            <PhotoToggle open={photoOpen} onClick={() => setPhotoOpen((o) => !o)} />
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
            slide={live.slideAt(slide) ?? current}
            index={slide}
            photos={photos && photosForPicker(show.id, show.slides, photos)}
            busy={busy}
            onPhoto={(photoIndex) => live.pickPhoto(slide, photoIndex)}
            onNewPhoto={() => setNewPhotoFor(slide)}
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
        <>
          <div className="min-w-0 px-1">
            <p className="truncate text-sm font-semibold">{show.topic}</p>
            <p className="truncate text-[11px] text-white/50">{show.modelName} · {slide + 1}/{show.slides.length}</p>
          </div>
          <SlideshowMenu disabled={video.rendering || busy !== null} busy={busy} onRewrite={() => void rewrite()} onDelete={() => void remove()} />
        </>
      }
      actions={actions}
    >
      <EditorBody
        player={player}
        strip={<SlideStrip slides={show.slides} index={slide} busy={busy} onPick={setSlide} textLayer={(i) => textLayer(i)} corner={textLock} footer={deleteControl} />}
        main={panel}
        aside={
          <EditorAside title="Post and Schedule">
            {/* Caption, then when it posts (as in a campaign). The music sits under the player. */}
            <div className="space-y-6">
              <CaptionPanel caption={drafts.caption} tags={drafts.tags} onCaption={drafts.setCaption} onTags={drafts.setTags} />
              <div className="border-t border-white/10 pt-4">
                <SchedulePanel plan={plan} ready={initial.status === 'ready'} />
              </div>
            </div>
          </EditorAside>
        }
      />
      {newPhotoFor !== null && (
        <NewPhotoDialog
          token={token}
          path={edit.photoPath(newPhotoFor)}
          slideNumber={newPhotoFor + 1}
          onClose={() => setNewPhotoFor(null)}
          onGenerate={(choice) => {
            const index = newPhotoFor;
            setNewPhotoFor(null);
            void edit.newPhoto(index, choice).then((ok) => ok && onPhotosChanged());
          }}
        />
      )}
    </EditorFrame>
  );
}
