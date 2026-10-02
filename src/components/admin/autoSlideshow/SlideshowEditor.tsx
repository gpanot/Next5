'use client';

import { useEffect, useState } from 'react';
import type { AutoPhotoDto, AutoSlideshowDto, AutoTrackDto } from '../../../types/admin/autoSlideshow';
import { CaptionPanel } from './CaptionPanel';
import { MusicPicker } from './MusicPicker';
import { PostPanel } from './posting/PostPanel';
import { SlidePreview } from './SlidePreview';
import { SlideEditPanel } from './SlideEditPanel';
import { SlideshowMenu } from './SlideshowMenu';
import { VideoButton } from './VideoButton';
import { parseTags, useSlideshowDrafts } from './useSlideshowDrafts';
import { useSlideshowEdit } from './useSlideshowEdit';
import { useSlideshowVideo } from './useSlideshowVideo';

type Props = {
  token: string;
  runId: string;
  initial: AutoSlideshowDto;
  photos: AutoPhotoDto[] | null;
  tracks: AutoTrackDto[] | null;
  onChanged: () => void;
  onPhotosChanged: () => void;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
};

const ghostButton = 'min-h-11 rounded-full px-3 text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-30';

/** Full-screen editor, phone first: preview on top (left on desktop), the on-screen slide's text and photo, the caption. */
export function SlideshowEditor({ token, runId, initial, photos, tracks, onChanged, onPhotosChanged, onClose, onPrev, onNext }: Props) {
  const edit = useSlideshowEdit(token, runId, initial, onChanged);
  const { show, busy } = edit;
  const [slide, setSlide] = useState(0);
  const video = useSlideshowVideo(token, runId, initial.id);
  const current = show.slides[Math.min(slide, show.slides.length - 1)];
  const drafts = useSlideshowDrafts(show, slide);
  const saving = busy === 'caption' || busy === `slide-${slide}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
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

  const remove = async () => {
    if (!window.confirm('Delete this slideshow? This cannot be undone.')) return;
    if (await edit.remove()) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white" role="dialog" aria-modal="true" aria-label={show.topic}>
      <header className="flex min-h-14 shrink-0 items-center gap-1 border-b border-white/10 px-2">
        <button onClick={onClose} aria-label="Close" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white/10">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-sm font-semibold">{show.topic}</p>
          <p className="truncate text-[11px] text-white/50">{show.modelName} · {slide + 1}/{show.slides.length}</p>
        </div>
        <button
          onClick={() => void save()}
          disabled={busy !== null || !drafts.dirty || !drafts.valid}
          className={`mr-1 flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition active:scale-95 ${
            drafts.dirty ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'bg-white/10 text-white/40'
          } disabled:active:scale-100 ${drafts.dirty && !saving ? 'disabled:opacity-50' : ''}`}
        >
          {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onPrev} disabled={!onPrev || busy !== null} aria-label="Previous slideshow" className={ghostButton}>‹</button>
        <button onClick={onNext} disabled={!onNext || busy !== null} aria-label="Next slideshow" className={ghostButton}>›</button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        <div className="shrink-0 p-4 md:flex md:w-1/2 md:flex-col md:justify-center md:overflow-y-auto">
          <SlidePreview show={show} index={slide} onIndex={setSlide} working={busy !== null && !['caption', 'delete', 'music'].includes(busy)} />
          <div className="mt-3 flex items-center justify-center gap-3">
            <div className="flex gap-1.5">
              {show.slides.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-5 bg-white' : 'w-1.5 bg-white/30'}`} />)}
            </div>
            <VideoButton
              rendering={video.rendering}
              disabled={busy !== null || show.slides.some((s) => !s.imageUrl)}
              onClick={() => void video.download()}
            />
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
          </div>
        </div>

        <div className="space-y-6 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:w-1/2 md:overflow-y-auto md:border-l md:border-white/10">
          {(edit.error ?? video.error) && <p className="rounded-lg bg-red-500/15 p-3 text-sm text-red-300">{edit.error ?? video.error}</p>}
          {current && (
            <SlideEditPanel
              slide={current}
              index={slide}
              photos={photos}
              busy={busy}
              title={drafts.title}
              body={drafts.body}
              onTitle={drafts.setTitle}
              onBody={drafts.setBody}
              menu={<SlideshowMenu disabled={video.rendering || busy !== null} busy={busy} onRewrite={() => void rewrite()} onDelete={() => void remove()} />}
              onPhoto={(photoIndex) => void edit.saveSlide(slide, { photoIndex })}
              onNewPhoto={() => void edit.newPhoto(slide).then((ok) => ok && onPhotosChanged())}
            />
          )}
          <MusicPicker show={show} tracks={tracks} busy={busy} onPick={(id) => void edit.setMusic(id)} />
          <CaptionPanel caption={drafts.caption} tags={drafts.tags} onCaption={drafts.setCaption} onTags={drafts.setTags} />
          <div className="border-t border-white/10 pt-4">
            <PostPanel token={token} runId={runId} show={show} onPosted={onChanged} />
          </div>
        </div>
      </div>
    </div>
  );
}
