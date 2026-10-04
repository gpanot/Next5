'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AutoTrackDto } from '../../../../types/admin/autoSlideshow';
import type { IdeaAudio } from '../../../../types/admin/calendarIdeas';
import { blitzApi } from '../../../labs/blitzLab/api';
import type { LabClient } from '../../../labs/labClient';

/**
 * The tracks a Blitz idea can take, as the Blitz deck lists them: the slideshow tracks first (with their best start),
 * then every library track. Loaded once, when the deck first shows.
 */
const loadTracks = async (client: LabClient): Promise<IdeaAudio[]> => {
  const [tracks, assets] = await Promise.all([
    client.request<{ tracks: AutoTrackDto[] }>('/auto-slideshow/music').catch(() => null),
    blitzApi.listAssets(client, 'AUDIO').catch(() => null),
  ]);
  const audio = assets?.ok ? (assets.data.assets ?? []).filter((a) => a.type === 'AUDIO') : [];
  const best = (tracks?.ok ? tracks.data.tracks ?? [] : []).flatMap((t) => {
    const asset = audio.find((a) => a.id === t.assetId);
    return asset ? [{ assetKey: asset.r2Key, url: t.url, startAt: t.startAt, label: t.name }] : [];
  });
  const rest = audio.filter((a) => !best.some((b) => b.assetKey === a.r2Key)).map((a) => ({ assetKey: a.r2Key, url: a.url, startAt: 0, label: a.name }));
  return [...best, ...rest];
};

/** "Random": any other track, so a tap always changes the music. Null when there is nothing else to pick. */
export function useIdeaMusic(client: LabClient | null) {
  const [tracks, setTracks] = useState<IdeaAudio[] | null>(null);
  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    void loadTracks(client).then((list) => !cancelled && setTracks(list));
    return () => {
      cancelled = true;
    };
  }, [client]);
  const randomOther = useCallback((currentKey: string | undefined): IdeaAudio | null => {
    const others = (tracks ?? []).filter((t) => t.assetKey !== currentKey);
    return others[Math.floor(Math.random() * others.length)] ?? null;
  }, [tracks]);
  return { ready: tracks !== null, canShuffle: (tracks?.length ?? 0) > 1, randomOther };
}
