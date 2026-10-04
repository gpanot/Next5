'use client';

import { GOAL_LABELS } from '../../../../types/admin/contentGoals';
import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import { toDeckCard } from '../../../labs/blitzLab/SlideshowDeckStep';
import type { DeckCardData } from '../../../labs/blitzLab/SwipeDeck';
import type { ShotView } from '../../../labs/blitzLab/SwipeCard';

/** "Video" or "Photo slideshow": shown on every idea, so the user knows what Make will make. */
export const formatLabel = (idea: IdeaDto) => (idea.format === 'blitz' ? 'Video' : 'Photo slideshow');

/** "Tue, Oct 7 · 7:00 PM" */
export const whenOf = (idea: IdeaDto, plannedAt: string = idea.plannedAt) => {
  const at = new Date(plannedAt);
  return `${at.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
};

/** A slideshow idea's rendered slides as card shots (the text is in the pictures). Before it is ready: the hook and
 *  slide titles on the run photo. */
const slideshowShots = (idea: IdeaDto): ShotView[] =>
  idea.slideshow?.slides.length
    ? idea.slideshow.slides.map((url) => ({ text: '', textZone: 'bottom', mediaUrl: url, mediaKind: 'image', fit: 'contain', mediaLabel: 'Slide' }))
    : [idea.hook, ...idea.outline].map((text, i) => ({
        text,
        textZone: i === 0 ? 'middle' : 'bottom',
        mediaUrl: idea.coverUrl ?? undefined,
        mediaKind: 'image',
        mediaLabel: 'Photo from your slideshows',
      }));

/** The idea as a deck card, for SwipeCard and (Blitz) for the render request. Its id is the idea's id. */
export const ideaCard = (idea: IdeaDto): DeckCardData => {
  if (idea.card) return { ...toDeckCard(idea.card, 0, undefined), id: idea.id, variantId: idea.id, status: 'new' };
  const goal = idea.goal ? GOAL_LABELS[idea.goal] : 'Slideshow';
  return {
    id: idea.id,
    lensValue: goal,
    lensId: idea.goal ?? 'slideshow',
    hookStyle: 'Photo slideshow',
    shots: slideshowShots(idea),
    status: 'new',
    whyPanel: { audience: goal, hookStyle: 'Photo slideshow', hookStyleReason: 'A photo slideshow made for you while you looked at the videos.', storyLines: idea.outline.map((text, i) => ({ label: `Slide ${i + 2}`, text })) },
  };
};
