'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BrandPhotoDto, BrandPhotosDto } from '../../../../types/admin/brandContent';
import { errorOf, type LabClient } from '../../../labs/labClient';
import { MAX_RAW_BYTES, shrinkPhoto } from './shrinkPhoto';

const OFFLINE = 'Could not reach the server. Check your connection.';

/** A photo on its way up: its local preview, and the reason when it failed. */
export type PendingPhoto = { key: string; preview: string; name: string; error: string | null };

const uploadOne = async (client: LabClient, file: File): Promise<BrandPhotoDto | string> => {
  const small = await shrinkPhoto(file);
  if (small.size > MAX_RAW_BYTES) return 'This photo is too big. Try a JPG or PNG.';
  const form = new FormData();
  form.append('file', small);
  const res = await client.request<BrandPhotoDto>('/brand-content', { form }).catch(() => null);
  if (!res) return OFFLINE;
  return res.ok ? res.data : errorOf(res);
};

/** The workspace's brand photos: load, upload (one at a time, previews meanwhile), delete. */
export function useBrandPhotos(client: LabClient) {
  const [photos, setPhotos] = useState<BrandPhotoDto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingPhoto[]>([]);

  const fetchList = useCallback(
    () => client.request<BrandPhotosDto>('/brand-content').catch(() => null).then((res) => {
      if (res?.ok) setPhotos(res.data.photos);
      else setLoadError(res ? errorOf(res) : OFFLINE);
    }),
    [client],
  );

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  /** "Try again" after a failed load. */
  const load = useCallback(() => {
    setLoadError(null);
    void fetchList();
  }, [fetchList]);

  const upload = useCallback(async (files: File[]) => {
    const batch = files.map((f, i) => ({ key: `${Date.now()}-${i}`, preview: URL.createObjectURL(f), name: f.name, error: null }));
    setPending((p) => [...batch, ...p]);
    for (const [i, file] of files.entries()) {
      const item = batch[i]!;
      const result = await uploadOne(client, file);
      if (typeof result === 'string') {
        setPending((p) => p.map((x) => (x.key === item.key ? { ...x, error: result } : x)));
        continue;
      }
      URL.revokeObjectURL(item.preview);
      setPending((p) => p.filter((x) => x.key !== item.key));
      setPhotos((list) => [result, ...(list ?? [])]);
    }
  }, [client]);

  const dismiss = useCallback((key: string) => {
    setPending((p) => {
      const item = p.find((x) => x.key === key);
      if (item) URL.revokeObjectURL(item.preview);
      return p.filter((x) => x.key !== key);
    });
  }, []);

  /** Removed at once; put back when the server says no. */
  const remove = useCallback(async (photo: BrandPhotoDto) => {
    setPhotos((list) => list?.filter((p) => p.id !== photo.id) ?? null);
    const res = await client.request(`/brand-content/${photo.id}`, { method: 'DELETE' }).catch(() => null);
    if (!res?.ok) setPhotos((list) => (list ? [photo, ...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : list));
  }, [client]);

  return { photos, loadError, pending, load, upload, dismiss, remove };
}
