import type { SetTemplateDto } from '../../../../types/business/catalog';

export type GenerationMode = 'automatic' | 'custom';

export type GenerationSettings = {
  themeId: string;
  mode: GenerationMode;
  /** Template ids chosen in custom mode. */
  templateIds: string[];
  /** Variations per style (1–6). */
  photosPerStyle: number;
};

/** "Automatic" makes this many photos in each of the first styles. */
export const AUTO_STYLE_COUNT = 5;
export const AUTO_PHOTOS = 6;
export const MAX_PHOTOS_PER_STYLE = 6;

export const DEFAULT_SETTINGS: GenerationSettings = { themeId: '', mode: 'custom', templateIds: [], photosPerStyle: 1 };

/** Template ids the create call sends. */
export const chosenTemplateIds = (settings: GenerationSettings, templates: readonly SetTemplateDto[]): string[] =>
  settings.mode === 'automatic' ? templates.slice(0, AUTO_STYLE_COUNT).map((t) => t.id) : settings.templateIds;

export const photosPerStyleOf = (settings: GenerationSettings): number =>
  settings.mode === 'automatic' ? AUTO_PHOTOS : settings.photosPerStyle;

/** Variations the choice makes, one credit each. */
export const totalPhotos = (settings: GenerationSettings, templates: readonly SetTemplateDto[]): number =>
  chosenTemplateIds(settings, templates).length * photosPerStyleOf(settings);
