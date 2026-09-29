'use client';

import { useEffect, useState } from 'react';
import type { AutoPhotoDto, AutoSlideshowDto, AutoTrackDto } from '../../../types/admin/autoSlideshow';
import { CaptionPanel } from './CaptionPanel';
import { downloadSlideshow } from './downloads';
import { MusicPicker } from './MusicPicker';
import { PostToTikTok } from './PostToTikTok';
import { SlidePreview } from './SlidePreview';
import { SlideEditPanel } from './SlideEditPanel';
import { useSlideshowEdit } from './useSlideshowEdit';

type Props = {
  token: string;
  runId: string;
  brandName: string;
  initial: AutoSlideshowDto;
  photos: AutoPhotoDto[] | null;
  tracks: AutoTrackDto[] | null;
  /** The run's TikTok account, preselected in Post to TikTok. */
  workspaceId: string | null;
  onChanged: () => void;
  onPhotosChanged: () => void;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
};

const ghostButton = 'min-h-11 rounded-full px-3 text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-30';

/** Full-screen editor, phone first: preview on top (left on desktop), the on-screen slide's text and photo, the caption. */
export function SlideshowEditor({ token, runId, brandName, initial, photos, tracks, workspaceId, onChanged, onPhotosChanged, onClose, onPrev, onNext }: Props) {
  const edit = useSlideshowEdit(token, runId, initial, onChanged);
  const { show, busy } = edit;
  const [slide, setSlide] = useState(0);
  const [zipping, setZipping] = useState(false);
  const current = show.slides[Math.min(slide, show.slides.length - 1)];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const zip = async () => {
    setZipping(true);
    await downloadSlideshow(show, brandName);
    setZipping(false);
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
        <button onClick={onPrev} disabled={!onPrev || busy !== null} aria-label="Previous slideshow" className={ghostButton}>‹</button>
        <button onClick={onNext} disabled={!onNext || busy !== null} aria-label="Next slideshow" className={ghostButton}>›</button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        <div className="shrink-0 p-4 md:flex md:w-1/2 md:flex-col md:justify-center md:overflow-y-auto">
          <SlidePreview show={show} index={slide} onIndex={setSlide} working={busy !== null && !['caption', 'delete', 'music'].includes(busy)} />
          <div className="mt-3 flex justify-center gap-1.5">
            {show.slides.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-5 bg-white' : 'w-1.5 bg-white/30'}`} />)}
          </div>
        </div>

        <div className="space-y-6 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:w-1/2 md:overflow-y-auto md:border-l md:border-white/10">
          {edit.error && <p className="rounded-lg bg-red-500/15 p-3 text-sm text-red-300">{edit.error}</p>}
          {current && (
            <SlideEditPanel
              key={`${slide}-${current.imageKey}`}
              slide={current}
              index={slide}
              photos={photos}
              busy={busy}
              onSaveText={(patch) => void edit.saveSlide(slide, patch)}
              onPhoto={(photoIndex) => void edit.saveSlide(slide, { photoIndex })}
              onNewPhoto={() => void edit.newPhoto(slide).then((ok) => ok && onPhotosChanged())}
            />
          )}
          <MusicPicker show={show} tracks={tracks} busy={busy} onPick={(id) => void edit.setMusic(id)} />
          <CaptionPanel key={`${show.caption}|${show.hashtags.join()}`} show={show} busy={busy} onSave={(c, h) => void edit.saveCaption(c, h)} />
          <div className="border-t border-white/10 pt-4">
            <PostToTikTok token={token} runId={runId} show={show} defaultWorkspaceId={workspaceId} onPosted={onChanged} />
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-4">
            <button onClick={() => void zip()} disabled={zipping || busy !== null} className="min-h-11 rounded-full bg-white text-sm font-semibold text-black transition active:scale-95 disabled:opacity-40">
              {zipping ? 'Zipping…' : 'Download ZIP'}
            </button>
            <button onClick={() => void edit.regenerate()} disabled={busy !== null} className="min-h-11 rounded-full border border-white/30 text-sm font-semibold transition active:scale-95 disabled:opacity-40">
              {busy === 'regenerate' ? 'Rewriting…' : 'Rewrite all text'}
            </button>
            <button onClick={() => void remove()} disabled={busy !== null} className="col-span-2 min-h-11 rounded-full text-sm font-medium text-red-300 transition hover:bg-red-500/10 disabled:opacity-40">
              {busy === 'delete' ? 'Deleting…' : 'Delete slideshow'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
