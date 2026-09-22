import type { SetTemplateDto } from '../../../../types/business/catalog';

export type GenerationMode = 'automatic' | 'custom';

export type GenerationSettings = {
  mode: GenerationMode;
  /** Template ids chosen in custom mode. */
  templateIds: string[];
};

/** Each style makes one photo (one credit). */
export const PHOTOS_PER_STYLE = 1;

/** Styles shown per swipe page in the style picker (3 × 2). */
export const STYLES_PER_PAGE = 6;

export const DEFAULT_SETTINGS: GenerationSettings = { mode: 'custom', templateIds: [] };

/** Template ids the create call sends: every style in "all styles" mode. */
export const chosenTemplateIds = (settings: GenerationSettings, templates: readonly SetTemplateDto[]): string[] =>
  settings.mode === 'automatic' ? templates.map((t) => t.id) : settings.templateIds;

/** Variations the choice makes, one credit each. */
export const totalPhotos = (settings: GenerationSettings, templates: readonly SetTemplateDto[]): number =>
  chosenTemplateIds(settings, templates).length * PHOTOS_PER_STYLE;
