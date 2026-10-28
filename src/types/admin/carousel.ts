/** Script Generator carousels: what the admin sends and what comes back. Client-safe. */
import type { CarouselQuestionKey, CarouselTemplate } from './carouselTemplates';
import type { HookAngle } from './scriptGenerator';

export type CarouselInput = {
  template: CarouselTemplate;
  /** Answers to the template's questions. */
  answers: Partial<Record<CarouselQuestionKey, string>>;
  /** Numbered lists only: how many items. */
  listCount?: number;
  /** "To be her / I had to be her" only. */
  pronoun?: 'her' | 'him';
  /** Slide 1 picked in the hook step; the carousel uses it as is. */
  hook?: CarouselHook;
};

/** One slide. On a split screen `text`/`photo` are the top half and `bottomText`/`bottomPhoto` the bottom half. */
export type CarouselSlide = { label: string; text: string; photo: string; bottomText?: string; bottomPhoto?: string };

/** Slide 1 options: about the viewer, never about the creator. */
export type CarouselHook = Omit<CarouselSlide, 'label'> & { angle: HookAngle };

export type GeneratedCarousel = {
  title: string;
  template: CarouselTemplate;
  slides: CarouselSlide[];
  /** The sound to add (it lets the carousel reach the Reels tab): mood, tempo, and where it builds to a crescendo. */
  song: string;
  caption: string;
  /** The profile call to action that names the pain point the carousel solved. */
  bioCta: string;
};

export type RefineCarouselResult = { refused: boolean; message: string; carousel: GeneratedCarousel };
