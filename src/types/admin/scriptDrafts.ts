/** Saved Script Generator work (table script_generator_drafts): video scripts and carousels. Client-safe. */
import type { CarouselInput, GeneratedCarousel } from './carousel';
import type { GeneratedScript, GenerateScriptInput, ScriptModel } from './scriptGenerator';

export type DraftChatEntry = { you: string; reply: string; refused: boolean };

export type DraftKind = 'video' | 'carousel';

/** One row of the "Saved scripts" list. `format` is a video format or 'carousel'; `structure` a structure or a template. */
export type DraftSummary = {
  id: string;
  kind: DraftKind;
  title: string;
  format: string;
  structure: string;
  photoCount: number;
  updatedAt: string;
};

/** `photoUrls` are short-lived signed links (1 hour), keyed by slot. */
type DraftBase = DraftSummary & { model: ScriptModel; chat: DraftChatEntry[]; photoUrls: Record<string, string> };

export type VideoDraft = DraftBase & { kind: 'video'; input: GenerateScriptInput; script: GeneratedScript };
export type CarouselDraft = DraftBase & { kind: 'carousel'; input: CarouselInput; script: GeneratedCarousel };
export type ScriptDraft = VideoDraft | CarouselDraft;

/** Photo slots: "3" is slide 4, "3b" its bottom half on a split screen. */
export const isPhotoSlot = (v: string): boolean => /^\d{1,2}b?$/.test(v);

export const PHOTO_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
