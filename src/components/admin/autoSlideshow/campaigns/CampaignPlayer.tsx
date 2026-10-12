'use client';

import { MIN_CAMPAIGN_CONTENT, type CampaignDraft, type CampaignPhotoDto } from '../../../../types/admin/slideshowCampaign';
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
  /** Removes content card `card` (slide card + 1). */
  onRemoveCard: (card: number) => void;
};

const action = 'flex h-10 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-30';

/**
 * The campaign's first slideshow in the slideshow editor's player, drawn live from the draft (photo plus text layers):
 * swipe, autoplay, drag the on-screen slide's text. Under it: the dots, "Reset text" and delete for content slides.
 */
export function CampaignPlayer({ draft, photos, index, onIndex, onMoveText, onRemoveCard }: Props) {
  const slides = draftShows(draft, photos)[0]!.slides;
  const card = index - 1;
  const isContent = index > 0 && draft.cards[card]?.role === 'item';
  const moved = index === 0 ? draft.hookTextAt : draft.cards[card]?.textAt;
  const contentCount = draft.cards.length - 1;
  return (
    <>
      <SlidePlayer
        count={slides.length}
        slideKey={(i) => String(i)}
        index={index}
        onIndex={onIndex}
        renderSlide={(i) => <PreviewSlideView slide={slides[i]!} movable={i === index} onMoveText={(at) => onMoveText(i, at)} />}
      />
      <PlayerControls count={slides.length} index={index}>
        {moved && (
          <button type="button" onClick={() => onMoveText(index, undefined)} title="Put the text back on its usual spot" className={`${action} px-3 text-xs`}>
            Reset text
          </button>
        )}
        {isContent && (
          <button
            type="button"
            onClick={() => onRemoveCard(card)}
            disabled={contentCount <= MIN_CAMPAIGN_CONTENT}
            aria-label={`Delete slide ${index + 1}`}
            title={contentCount <= MIN_CAMPAIGN_CONTENT ? 'A campaign needs at least one content slide' : `Delete slide ${index + 1}`}
            className={`${action} w-10 hover:bg-red-500/15 hover:text-red-300`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
            </svg>
          </button>
        )}
      </PlayerControls>
    </>
  );
}
