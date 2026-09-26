import { STUDIO_MODELS } from '../../../../content/business/catalog/studioModels';
import type { StudioSetDto } from '../../../../types/business/catalog';

/** `modelRef` for "the seller wears it herself". */
export const ME = 'me';

export type ModelInfo = {
  ref: string;
  name: string;
  description: string;
  /** Manifest image. Null for "You" (her photos are signed URLs) or an unknown model. */
  faceImage: string | null;
  fullImage: string | null;
  isMe: boolean;
};

export const modelInfo = (ref: string): ModelInfo => {
  if (ref === ME) return { ref, name: 'You', description: 'Made from your own photos', faceImage: null, fullImage: null, isMe: true };
  const m = STUDIO_MODELS.find((x) => x.slug === ref);
  if (!m) return { ref, name: 'Studio model', description: '', faceImage: null, fullImage: null, isMe: false };
  return { ref, name: m.name, description: `${m.age} · ${m.description}`, faceImage: m.faceImage, fullImage: m.fullImage, isMe: false };
};

export type ModelGroup = { model: ModelInfo; sets: StudioSetDto[] };

/**
 * A shop "set" is one model in one scene. The page shows them the way sellers think:
 * one card per model, with the scenes she poses in. You first, then models in the order added.
 */
export const groupByModel = (sets: readonly StudioSetDto[]): ModelGroup[] => {
  const groups = new Map<string, StudioSetDto[]>();
  for (const set of sets) {
    const ref = set.modelRef || ME;
    groups.set(ref, [...(groups.get(ref) ?? []), set]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => Number(b === ME) - Number(a === ME))
    .map(([ref, list]) => ({ model: modelInfo(ref), sets: list }));
};
