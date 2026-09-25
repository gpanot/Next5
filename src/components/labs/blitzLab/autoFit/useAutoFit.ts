'use client';

import { useCallback, useState } from 'react';
import { useLabClient } from '../../LabClientProvider';
import { blitzApi } from '../api';
import { buildSnapshot, type OverlayTransform, type SnapshotInput } from './snapshot';

export type AutoFitApply = {
  overlay: OverlayTransform;
  caption: { positionY: number; offsetX: number };
};

/**
 * "Auto Fit": snapshot the first frame, ask the model where the meme and caption should go,
 * apply it. `getInput` returns null when there is nothing to fit yet.
 */
export function useAutoFit(getInput: () => SnapshotInput | null, onApply: (fit: AutoFitApply) => void) {
  const client = useLabClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  const run = useCallback(async () => {
    const input = getInput();
    if (!input) return;
    setBusy(true);
    setError(null);
    try {
      const snap = await buildSnapshot(input);
      const res = await blitzApi.autoFit(client, {
        backgroundJpeg: snap.backgroundJpeg,
        compositeJpeg: snap.compositeJpeg,
        captionText: input.captionText,
        layout: snap.layout,
      });
      if (!res.ok) throw new Error(res.data.error ?? 'Auto Fit failed — try again');
      const d = res.data;
      onApply({
        overlay: { zoom: d.overlayZoom, offsetX: d.overlayOffsetX, offsetY: d.overlayOffsetY },
        caption: { positionY: d.captionPositionY, offsetX: d.captionOffsetX },
      });
      setReason(d.reason);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto Fit failed — try again');
    } finally {
      setBusy(false);
    }
  }, [client, getInput, onApply]);

  return { run, busy, error, reason };
}
