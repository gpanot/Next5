'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { FORMATS, type FormatId } from '../../../config/formats';
import { useEstimate } from '../../../hooks/useEstimate';
import { lastSetStore } from '../../../lib/localStore';
import type { SetTemplateDto, StudioSetDto } from '../../../types/business/catalog';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { modelSetIds, toModelSetId } from './ShopModelPicker';
import { withAllPoses, type ScenePick } from './ScenePicker';

const list = (value: string | null): string[] => (value ?? '').split(',').filter(Boolean);
const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Create a drop: products × models × picked poses (across scenes) × formats.
 * A link can carry products, models and formats (?products=&models=&formats=; ?set= from older drop emails).
 */
export const useShopDraft = (sets: readonly StudioSetDto[], scenes: readonly SetTemplateDto[]) => {
  const { me } = useWorkspace();
  const params = useSearchParams();
  const lastSet = lastSetStore.useValue();
  const preselected = list(params.get('products'));
  const defaults = (me?.workspace?.defaultFormats ?? []).filter((f): f is FormatId => f in FORMATS);
  const urlFormats = list(params.get('formats')).filter((f): f is FormatId => f in FORMATS);
  const urlModels = [...list(params.get('models')), ...list(params.get('set'))];

  const [selected, setSelected] = useState<Set<string>>(new Set(preselected));
  const [onlyNew, setOnlyNew] = useState(preselected.length === 0);
  const [pickedModels, setModels] = useState<string[] | null>(urlModels.length ? urlModels : null);
  const [pickedScenes, setScenes] = useState<ScenePick[] | null>(null);
  const [formats, setFormats] = useState<FormatId[]>(urlFormats.length ? urlFormats : defaults.length ? defaults : ['square_1_1']);
  const [highRes, setHighRes] = useState(false);
  const [withCover, setWithCover] = useState(true);

  // Default model: the one she used last, else her first. Only one row per model counts.
  const modelIds = modelSetIds(sets);
  const fallback = (lastSet && toModelSetId(sets, lastSet)) ?? modelIds[0];
  const models = [...new Set((pickedModels ?? [fallback]).map((id) => (id ? toModelSetId(sets, id) : null)))].filter((id): id is string => Boolean(id));
  // Default: the first scene (Clean Studio) with all its poses.
  const scenePicks = (pickedScenes ?? (scenes[0] ? [withAllPoses(scenes[0])] : [])).filter((p) => scenes.some((s) => s.id === p.id));
  const poseCount = scenePicks.reduce((n, p) => n + p.poseIds.length, 0);
  const productIds = [...selected];

  // useEstimate keys on the JSON, so a fresh object each render is fine.
  const [setId, ...setIds] = models;
  const draft = setId && scenePicks.length && productIds.length
    ? { product: 'shop', kind: 'shop_products', setId, setIds, scenes: scenePicks, productIds, formats, highRes, withCover }
    : null;
  const estimate = useEstimate(draft);

  const cover = withCover && !formats.includes('story_9_16');
  const breakdown = `${plural(productIds.length, 'product')} × ${plural(models.length, 'model')} × ${plural(poseCount, 'pose')} × ${plural(formats.length, 'format')}${cover ? ' + 1 cover each' : ''}`;

  const toggleProduct = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return {
    selected, toggleProduct, onlyNew, setOnlyNew,
    models, setModels, scenePicks, setScenes,
    formats, setFormats, highRes, setHighRes, withCover, setWithCover,
    draft, breakdown, ...estimate,
  };
};
