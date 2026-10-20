'use client';

import type { CampaignDraft, CampaignPhotoDto } from '../../../../types/admin/slideshowCampaign';
import type { AutoTrackDto } from '../../../../types/admin/autoSlideshow';
import type { TextAt } from '../../../../types/slideText';
import { PlayerControls, SlidePlayer } from '../SlidePlayer';
import { draftShows } from './previewSlides';
import { PreviewSlideView } from './PreviewSlideView';

type Props = {
  draft: CampaignDraft;
  photos: CampaignPhotoDto[];
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
  /** The campaign's music, played with autoplay; null for none. */
  audio?: AutoTrackDto | null;
};

/**
 * The campaign's first slideshow in the slideshow editor's player, drawn live from the draft (photo plus text layers):
 * swipe, autoplay, drag the on-screen slide's text. Under it: the dots and the music.
 */
export function CampaignPlayer({ draft, photos, index, onIndex, onMoveText, onMoveBadges, safeZone, loading, audio = null }: Props) {
  const slides = draftShows(draft, photos)[0]!.slides;
  return (
    <>
      <SlidePlayer
        count={slides.length}
        slideKey={(i) => String(i)}
        index={index}
        onIndex={onIndex}
        safeZone={safeZone}
        audio={audio}
        renderSlide={(i) => <PreviewSlideView slide={slides[i]!} movable={i === index} quiet loading={loading.has(i)} onMoveText={(at) => onMoveText(i, at)} onMoveBadges={(y) => onMoveBadges(i, y)} />}
      />
      <PlayerControls count={slides.length} index={index} />
    </>
  );
}
