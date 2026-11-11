'use client';

import type { CampaignDraft, CampaignPhotoDto } from '../../../../types/admin/slideshowCampaign';
import type { AutoTrackDto } from '../../../../types/admin/autoSlideshow';
import type { TextAt } from '../../../../types/slideText';
import { PlayerControls, SlidePlayer } from '../SlidePlayer';
import { draftShows, withThumb, type PickedThumbs } from './previewSlides';
import { PreviewSlideView } from './PreviewSlideView';

type Props = {
  draft: CampaignDraft;
  photos: CampaignPhotoDto[];
  /** Which hook's slideshow plays (the strip shows the same one). */
  hook: number;
  onHook: (i: number) => void;
  index: number;
  onIndex: (i: number) => void;
  /** Slide i's text dragged to `at`; undefined puts it back on its usual spot. */
  onMoveText: (i: number, at: TextAt | undefined) => void;
  /** Slide i's badge row dragged to `y`; undefined puts it back on its usual spot. */
  onMoveBadges: (i: number, y: number | undefined) => void;
  /** TikTok's covered bands drawn over the slide on screen. */
  safeZone?: boolean;
  /** Slides whose photo is being made or copied in. */
  loading: ReadonlySet<number>;
  /** Picks being copied in, already drawn on their slides. */
  thumbs: PickedThumbs;
  /** The campaign's music, played with autoplay; null for none. */
  audio?: AutoTrackDto | null;
};

/** "1 2 3" above the player: which hook's slideshow it plays (each hook has its own hook photo). */
function HookSwitch({ count, value, onChange }: { count: number; value: number; onChange: (i: number) => void }) {
  if (count < 2) return null;
  return (
    <div role="radiogroup" aria-label="Hook to preview" className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={i === value}
          aria-label={`Hook ${i + 1}`}
          onClick={() => onChange(i)}
          className={`flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full px-3 text-sm font-semibold transition active:scale-95 ${i === value ? 'bg-white text-zinc-950' : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'}`}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );
}

/**
 * One of the campaign's slideshows (one per hook, picked above it) in the slideshow editor's player, drawn live from the draft (photo plus text layers):
 * swipe, autoplay, drag the on-screen slide's text. Under it: the dots and the music.
 */
export function CampaignPlayer({ draft, photos, hook, onHook, index, onIndex, onMoveText, onMoveBadges, safeZone, loading, thumbs, audio = null }: Props) {
  const shows = draftShows(draft, photos);
  const slides = shows[hook]!.slides;
  return (
    <>
      <HookSwitch count={shows.length} value={hook} onChange={onHook} />
      <SlidePlayer
        count={slides.length}
        slideKey={(i) => `${hook}-${i}`}
        index={index}
        onIndex={onIndex}
        safeZone={safeZone}
        audio={audio}
        renderSlide={(i) => <PreviewSlideView slide={withThumb(slides[i]!, i === 0 ? thumbs.hook.get(hook) : thumbs.slides.get(i))} movable={i === index} quiet loading={loading.has(i)} onMoveText={(at) => onMoveText(i, at)} onMoveBadges={(y) => onMoveBadges(i, y)} />}
      />
      <PlayerControls count={slides.length} index={index} />
    </>
  );
}
