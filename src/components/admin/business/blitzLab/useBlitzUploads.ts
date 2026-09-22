'use client';

/**
 * Optimistic uploads for Blitz Lab.
 *
 * On file pick the preview switches at once to a local blob: URL under a
 * temporary key ("local:<n>"). The real upload runs in the background. When it
 * finishes, the temporary key is swapped for the R2 key. The blob URL stays as
 * the preview source so the player does not reload the video.
 */

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { BlitzAssetDto } from './api';
import { uploadBlitzAsset, type BlitzUploadType } from './upload';

export type UploadStatus = { type: BlitzUploadType; progress: number; error: string | null };

export const LOCAL_KEY_PREFIX = 'local:';

export const isLocalKey = (key: string | undefined): boolean => Boolean(key?.startsWith(LOCAL_KEY_PREFIX));

type Options = {
  token: string;
  setAssets: Dispatch<SetStateAction<BlitzAssetDto[]>>;
  /** Called when a temporary key is replaced by the saved R2 key. */
  onKeyReplaced: (localKey: string, r2Key: string) => void;
};

export function useBlitzUploads({ token, setAssets, onKeyReplaced }: Options) {
  const [uploads, setUploads] = useState<Record<string, UploadStatus>>({});
  const files = useRef(new Map<string, { file: File; blobUrl: string }>());
  const counter = useRef(0);

  const patch = useCallback((key: string, next: Partial<UploadStatus>) => {
    setUploads((prev) => (prev[key] ? { ...prev, [key]: { ...prev[key], ...next } } : prev));
  }, []);

  const run = useCallback(async (localKey: string, type: BlitzUploadType) => {
    const entry = files.current.get(localKey);
    if (!entry) return;
    patch(localKey, { progress: 0, error: null });
    try {
      const saved = await uploadBlitzAsset(token, type, entry.file, (p) => patch(localKey, { progress: p }));
      setAssets((prev) => prev.map((a) => (a.r2Key === localKey ? { ...saved, url: entry.blobUrl } : a)));
      onKeyReplaced(localKey, saved.r2Key);
      setUploads((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== localKey)));
    } catch (err) {
      patch(localKey, { error: err instanceof Error ? err.message : 'Upload failed' });
    }
  }, [token, setAssets, onKeyReplaced, patch]);

  /** Adds a local preview asset, starts the upload, returns the temporary key. */
  const startUpload = useCallback((type: BlitzUploadType, file: File): string => {
    counter.current += 1;
    const localKey = `${LOCAL_KEY_PREFIX}${counter.current}`;
    const blobUrl = URL.createObjectURL(file);
    files.current.set(localKey, { file, blobUrl });
    setAssets((prev) => [...prev, {
      id: localKey,
      name: file.name,
      type,
      r2Key: localKey,
      url: blobUrl,
      thumbnailUrl: null,
      mediaKind: file.type.startsWith('image/') ? 'image' : 'video',
      createdAt: new Date().toISOString(),
    }]);
    setUploads((prev) => ({ ...prev, [localKey]: { type, progress: 0, error: null } }));
    void run(localKey, type);
    return localKey;
  }, [setAssets, run]);

  const retry = useCallback((localKey: string) => {
    const status = uploads[localKey];
    if (status) void run(localKey, status.type);
  }, [uploads, run]);

  useEffect(() => {
    const map = files.current;
    return () => map.forEach(({ blobUrl }) => URL.revokeObjectURL(blobUrl));
  }, []);

  return { uploads, startUpload, retry };
}
