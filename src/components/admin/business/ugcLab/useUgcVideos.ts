'use client';

import { useState } from 'react';
import type { UgcEta, UgcVideoDto } from '../../../../types/admin/ugc';
import { ugcRequest, useAdminApi } from './api';

/** Videos from the database, with local add, update and delete so the list reacts before the next reload. */
export const useUgcVideos = (token: string) => {
  const { data, error, loading, refresh } = useAdminApi<{ videos: UgcVideoDto[]; etas: Partial<Record<number, UgcEta>> }>(token, '/api/admin/ugc-lab/videos');
  // Server list until the page changes it (a new video, a poll update, a delete).
  const [own, setOwn] = useState<UgcVideoDto[] | null>(null);
  const videos = own ?? data?.videos ?? [];
  const edit = (fn: (prev: UgcVideoDto[]) => UgcVideoDto[]) => setOwn((prev) => fn(prev ?? data?.videos ?? []));

  return {
    videos,
    etas: data?.etas ?? {},
    error,
    loading: loading && !data,
    reload: () => {
      setOwn(null);
      refresh();
    },
    add: (video: UgcVideoDto) => edit((prev) => [video, ...prev.filter((v) => v.id !== video.id)]),
    addMany: (list: UgcVideoDto[]) => edit((prev) => [...list, ...prev.filter((v) => !list.some((n) => n.id === v.id))]),
    update: (video: UgcVideoDto) => edit((prev) => prev.map((v) => (v.id === video.id ? video : v))),
    remove: (id: string) => {
      edit((prev) => prev.filter((v) => v.id !== id));
      void ugcRequest(token, `/api/admin/ugc-lab/videos/${id}`, { method: 'DELETE' });
    },
  };
};
