'use client';

/**
 * Form state for one hand-typed business: load a saved run, edit, save (create or new version).
 * List fields are edited as text (one item per line) and split on save.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  EMPTY_MANUAL_INPUT,
  MANUAL_SECTIONS,
  manualInputFromProfile,
  missingManualFields,
  normalizeManualInput,
  productPhotosFromProfile,
  type ManualField,
  type ManualProfileInput,
  type ManualTone,
} from '../../../../lib/manualProfile';
import { errorOf } from '../../labClient';
import { useLabClient } from '../../LabClientProvider';
import type { BlitzAssetDto } from '../api';
import { manualApi } from './manualApi';
import { useProductPhotos } from './useProductPhotos';

export type ManualFormValues = Record<ManualField['key'], string> & { tone: ManualTone };

const FIELDS = MANUAL_SECTIONS.flatMap((s) => s.fields);

const toValues = (input: ManualProfileInput): ManualFormValues => {
  const values = { tone: input.tone } as ManualFormValues;
  FIELDS.forEach((f) => {
    const v = input[f.key];
    values[f.key] = Array.isArray(v) ? v.join('\n') : v;
  });
  return values;
};

const toInput = (values: ManualFormValues): ManualProfileInput => {
  const raw: Record<string, unknown> = { tone: values.tone };
  FIELDS.forEach((f) => { raw[f.key] = f.list ? values[f.key].split('\n') : values[f.key]; });
  return normalizeManualInput(raw);
};

export function useManualBusiness(runId: string | null, onUploaded: (asset: BlitzAssetDto) => void) {
  const client = useLabClient();
  const [values, setValues] = useState<ManualFormValues>(() => toValues(EMPTY_MANUAL_INPUT));
  const [loading, setLoading] = useState(Boolean(runId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showMissing, setShowMissing] = useState(false);
  const photos = useProductPhotos(onUploaded);
  const { reset: resetPhotos } = photos;

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    manualApi.getRun(client, runId)
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) throw new Error(errorOf(res));
        setValues(toValues(manualInputFromProfile(res.data.brandProfile.data)));
        resetPhotos(productPhotosFromProfile(res.data.brandProfile.data));
      })
      .catch((err: unknown) => { if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [client, runId, resetPhotos]);

  const setField = useCallback((key: keyof ManualFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const missing = missingManualFields(toInput(values));

  /** Saves and returns the run id, or null when blocked / failed. Photos come back described. */
  const save = async (): Promise<string | null> => {
    setShowMissing(true);
    if (missing.length > 0 || photos.uploading) return null;
    setSaving(true);
    setSaveError(null);
    try {
      const input = toInput(values);
      const res = runId
        ? await manualApi.update(client, runId, input, photos.assetIds)
        : await manualApi.create(client, input, photos.assetIds);
      if (!res.ok) throw new Error(errorOf(res));
      resetPhotos(res.data.products);
      return res.data.runId;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setSaving(false);
    }
  };

  return { values, setField, loading, loadError, saving, saveError, missing, showMissing, photos, save };
}
