'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminFetch } from '../../business/useAdminApi';

/** One photo spot: "3" is slide 3 (0-based), "3b" is the bottom half of a split slide 3. */
export type SlotKey = string;

/** `saving`: shown from this computer while it uploads. `failed`: shown, but not saved (Retry uploads it again). */
export type SlotPhoto = { url: string; state: 'saved' | 'saving' | 'failed'; file?: File };

const isImage = (f: File) => f.type.startsWith('image/');

/** Long edge of a saved photo. Big enough for a 1080 x 1920 slide, small enough to send in one request. */
const MAX_EDGE = 1440;

/** The photo as a JPEG of at most MAX_EDGE px. Falls back to the original when the browser cannot decode it. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86));
    return blob ?? file;
  } catch {
    return file;
  }
}

/**
 * Carousel preview photos, saved with the script (R2 + script_generator_drafts.photos).
 * A new photo shows at once from this computer, then uploads; a reopened script starts from its saved photos.
 */
export function useSlidePhotos(token: string, draftId: string | null, saved: Record<SlotKey, string>) {
  const [photos, setPhotos] = useState<Record<SlotKey, SlotPhoto>>(() =>
    Object.fromEntries(Object.entries(saved).map(([slot, url]) => [slot, { url, state: 'saved' as const }])),
  );
  const live = useRef(photos);
  const locals = useRef(new Set<string>());

  useEffect(() => () => locals.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const patch = useCallback((slot: SlotKey, value: SlotPhoto | null) => {
    const next = { ...live.current };
    const old = next[slot];
    if (old && old.url !== value?.url && locals.current.delete(old.url)) URL.revokeObjectURL(old.url);
    if (value) next[slot] = value;
    else delete next[slot];
    live.current = next;
    setPhotos(next);
  }, []);

  const upload = useCallback(async (slot: SlotKey, file: File, url: string) => {
    if (!draftId) return;
    try {
      const form = new FormData();
      form.append('slot', slot);
      form.append('file', await shrink(file), 'photo.jpg');
      const res = await fetch(`/api/admin/script-generator/drafts/${draftId}/photos`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      if (live.current[slot]?.url === url) patch(slot, { url, state: 'saved' });
    } catch {
      if (live.current[slot]?.url === url) patch(slot, { url, state: 'failed', file });
    }
  }, [token, draftId, patch]);

  const put = useCallback((slot: SlotKey, file: File) => {
    if (!isImage(file) || !draftId) return;
    const url = URL.createObjectURL(file);
    locals.current.add(url);
    patch(slot, { url, state: 'saving' });
    void upload(slot, file, url);
  }, [draftId, patch, upload]);

  const retry = useCallback((slot: SlotKey) => {
    const p = live.current[slot];
    if (!p?.file) return;
    patch(slot, { ...p, state: 'saving' });
    void upload(slot, p.file, p.url);
  }, [patch, upload]);

  const remove = useCallback((slot: SlotKey) => {
    patch(slot, null);
    if (draftId) void adminFetch(token, `/api/admin/script-generator/drafts/${draftId}/photos?slot=${slot}`, { method: 'DELETE' }).catch(() => undefined);
  }, [token, draftId, patch]);

  /** Puts the files, in order, on the empty slots (in slide order). Extra files are ignored. */
  const fill = useCallback((files: File[], slots: SlotKey[]) => {
    const empty = slots.filter((s) => !live.current[s]);
    files.filter(isImage).slice(0, empty.length).forEach((f, i) => put(empty[i], f));
  }, [put]);

  const clear = useCallback(() => Object.keys(live.current).forEach(remove), [remove]);

  return { photos, ready: !!draftId, put, retry, remove, fill, clear };
}

export type SlidePhotos = ReturnType<typeof useSlidePhotos>;
