'use client';

import { useCallback, useState } from 'react';
import { useLabClient } from '../LabClientProvider';
import { blitzApi, type RemixLayer } from './api';
import type { CurrentAssets } from './AssetsPanel';

type Options = {
  captionText: string;
  currentAssets: CurrentAssets;
  businessText?: string;
  hint?: string;
  /** Applies the new combination to the editor. */
  onApply: (next: { captionText: string; currentAssets: CurrentAssets; overlayChanged: boolean }) => void;
};

const LAYERS: RemixLayer[] = ['caption', 'overlay', 'background', 'audio'];

/**
 * "Remix it!": the locked layers stay, the model picks a new combination of the others.
 * No layer selected = Random: one random layer is locked each time.
 */
export function useAiRemix({ captionText, currentAssets, businessText, hint, onApply }: Options) {
  const client = useLabClient();
  const [locks, setLocks] = useState<RemixLayer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ locked: RemixLayer[]; reason: string; usedVectors: boolean } | null>(null);

  /** Toggles one layer; null clears the selection (Random). */
  const toggleLock = useCallback((layer: RemixLayer | null) => {
    setLocks((prev) => (layer === null ? [] : prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer]));
  }, []);

  const run = useCallback(async () => {
    const locked = locks.length > 0 ? locks : [LAYERS[Math.floor(Math.random() * LAYERS.length)]!];
    setBusy(true);
    setError(null);
    const res = await blitzApi.remix(client, {
      locked,
      captionText,
      overlayKey: currentAssets.overlayKey,
      backgroundKey: currentAssets.backgroundKey,
      audioKey: currentAssets.audioKey,
      businessText,
      hint,
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) { setError(res?.data.error ?? 'Remix failed — try again'); return; }
    const d = res.data;
    onApply({
      captionText: d.captionText,
      currentAssets: { overlayKey: d.overlayKey, backgroundKey: d.backgroundKey, audioKey: d.audioKey ?? undefined },
      overlayChanged: d.overlayKey !== currentAssets.overlayKey,
    });
    setResult({ locked: d.locked, reason: d.reason, usedVectors: d.usedVectors });
  }, [client, locks, captionText, currentAssets, businessText, hint, onApply]);

  return { locks, toggleLock, busy, error, result, run };
}
