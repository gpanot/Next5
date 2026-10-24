/** Saved Script Generator scripts (table script_generator_drafts). Client-safe. */
import type { GeneratedScript, GenerateScriptInput, ScriptModel } from './scriptGenerator';

export type DraftChatEntry = { you: string; reply: string; refused: boolean };

/** One row of the "Saved scripts" list. */
export type DraftSummary = {
  id: string;
  title: string;
  format: GeneratedScript['format'];
  structure: GeneratedScript['structure'];
  photoCount: number;
  updatedAt: string;
};

/** A saved script, opened. `photoUrls` are short-lived signed links (1 hour), keyed by slot. */
export type ScriptDraft = DraftSummary & {
  model: ScriptModel;
  input: GenerateScriptInput;
  script: GeneratedScript;
  chat: DraftChatEntry[];
  photoUrls: Record<string, string>;
};

/** Photo slots: "3" is slide 4, "3b" its bottom half on a split screen. */
export const isPhotoSlot = (v: string): boolean => /^\d{1,2}b?$/.test(v);

export const PHOTO_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
