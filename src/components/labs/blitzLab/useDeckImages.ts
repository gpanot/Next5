'use client';

import { useEffect, useState } from 'react';
import { useLabClient } from '../LabClientProvider';
import { errorOf } from '../labClient';
import type { DeckImageDto } from '../../../server/labs/deckImages';

export type { DeckImageDto };

type Options = {
  /** R2 keys the deck uses. Read once, when the modal mounts (it mounts on open). */
  keys: string[];
  onReplaced: (oldKey: string, next: { r2Key: string; url: string }) => void;
  onRemoved: (r2Key: string) => void;
};

type Status = 'loading' | 'ready' | 'error';

/** The deck's images for the Assets modal, with regenerate and delete. */
export function useDeckImages({ keys, onReplaced, onRemoved }: Options) {
  const client = useLabClient();
  const [images, setImages] = useState<DeckImageDto[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [busy, setBusy] = useState<Record<string, 'regenerate' | 'delete'>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [initialKeys] = useState(keys);

  useEffect(() => {
    let cancelled = false;
    client
      .request<{ images: DeckImageDto[] }>('/blitz/deck-images', { json: { keys: initialKeys } })
      .then((res) => {
        if (cancelled) return;
        setImages(res.ok ? res.data.images ?? [] : []);
        setStatus(res.ok ? 'ready' : 'error');
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [client, initialKeys]);

  const track = (id: string, action: 'regenerate' | 'delete' | null, error?: string) => {
    setBusy((prev) => {
      const next = { ...prev };
      if (action) next[id] = action;
      else delete next[id];
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      if (error) next[id] = error;
      else delete next[id];
      return next;
    });
  };

  const regenerate = async (image: DeckImageDto) => {
    track(image.id, 'regenerate');
    const res = await client
      .request<{ image: DeckImageDto }>(`/blitz/deck-images/${image.id}/regenerate`, { method: 'POST' })
      .catch(() => null);
    if (!res?.ok) return track(image.id, null, res ? errorOf(res) : 'Network error. Try again.');
    const next = res.data.image;
    setImages((prev) => prev.map((i) => (i.id === image.id ? next : i)));
    onReplaced(image.r2Key, { r2Key: next.r2Key, url: next.url });
    track(image.id, null);
  };

  const remove = async (image: DeckImageDto) => {
    track(image.id, 'delete');
    const res = await client
      .request<{ r2Key: string }>(`/blitz/deck-images/${image.id}`, { method: 'DELETE' })
      .catch(() => null);
    if (!res?.ok) return track(image.id, null, res ? errorOf(res) : 'Network error. Try again.');
    setImages((prev) => prev.filter((i) => i.id !== image.id));
    onRemoved(image.r2Key);
    track(image.id, null);
  };

  return { images, status, busy, errors, regenerate, remove };
}
