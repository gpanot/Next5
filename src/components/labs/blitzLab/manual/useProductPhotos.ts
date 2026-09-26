'use client';

/**
 * Product photos for the "B2B No Website" form: uploads (shrunk in the browser first, then saved
 * as BACKGROUND assets like any Blitz upload), removal, and the vision descriptions once saved.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { compressImage } from '../../../../lib/imageCompress';
import { MAX_PRODUCT_PHOTOS, type ProductPhoto } from '../../../../lib/manualProfile';
import type { BlitzAssetDto } from '../api';
import { uploadBlitzAsset } from '../upload';
import { useLabClient } from '../../LabClientProvider';

export type PhotoItem = {
  /** Local id while uploading, then the asset id. */
  key: string;
  assetId?: string;
  previewUrl: string;
  name: string;
  /** 0–1 while uploading. */
  progress: number;
  error?: string;
  /** Vision description, known after the profile is saved. */
  description?: string;
};

export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

/** Saved photo → item. The proxy URL serves it like any Blitz asset. */
export const itemFromPhoto = (p: ProductPhoto): PhotoItem => ({
  key: p.assetId,
  assetId: p.assetId,
  previewUrl: `/api/admin/blitz/proxy?key=${encodeURIComponent(p.r2Key)}`,
  name: p.description,
  progress: 1,
  description: p.description,
});

export function useProductPhotos(onUploaded: (asset: BlitzAssetDto) => void) {
  const client = useLabClient();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const objectUrls = useRef<string[]>([]);

  useEffect(() => () => objectUrls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const patch = useCallback((key: string, next: Partial<PhotoItem>) => {
    setPhotos((prev) => prev.map((p) => (p.key === key ? { ...p, ...next } : p)));
  }, []);

  const uploadOne = useCallback(async (file: File, key: string) => {
    try {
      const small = await compressImage(file);
      const asset = await uploadBlitzAsset(client, 'BACKGROUND', small, (progress) => patch(key, { progress }));
      patch(key, { assetId: asset.id, progress: 1 });
      onUploaded(asset);
    } catch (err) {
      patch(key, { error: err instanceof Error ? err.message : 'Upload failed' });
    }
  }, [client, patch, onUploaded]);

  const addFiles = useCallback((files: File[]) => {
    const room = MAX_PRODUCT_PHOTOS - photos.length;
    const picked = files.filter((f) => f.type.startsWith('image/')).slice(0, Math.max(0, room));
    const items = picked.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      objectUrls.current.push(previewUrl);
      return { key: `local-${crypto.randomUUID()}`, previewUrl, name: file.name, progress: 0 };
    });
    setPhotos((prev) => [...prev, ...items]);
    items.forEach((item, i) => void uploadOne(picked[i]!, item.key));
  }, [photos.length, uploadOne]);

  const remove = useCallback((key: string) => {
    setPhotos((prev) => prev.filter((p) => p.key !== key));
  }, []);

  /** Saved profile → the photos with their descriptions (replaces the list). */
  const reset = useCallback((saved: ProductPhoto[]) => setPhotos(saved.map(itemFromPhoto)), []);

  const uploading = photos.some((p) => !p.assetId && !p.error);
  const assetIds = photos.flatMap((p) => (p.assetId ? [p.assetId] : []));

  return { photos, addFiles, remove, reset, uploading, assetIds };
}
