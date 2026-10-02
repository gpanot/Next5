'use client';

// Music for the card on screen in the deck: one dropdown for the Assets Library tracks, one for the
// tracks the Auto Slideshow detail page uses (same library, with each track's best start point).

import { Music, Shuffle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AutoTrackDto } from '../../../types/admin/autoSlideshow';
import { useLabClient } from '../LabClientProvider';
import type { BlitzAssetDto } from './api';
import { MusicSelect } from './MusicSelect';
import type { DeckCardData } from './SwipeDeck';

type DeckAudio = NonNullable<DeckCardData['audio']>;

type Props = {
  /** The card on screen (top of the deck or the one in Preview). Null = nothing to set music on. */
  card: DeckCardData | null;
  /** Blitz assets; only AUDIO ones are listed. */
  assets: BlitzAssetDto[];
  onChange: (cardId: string, audio: DeckAudio) => void;
};

/** Slideshow tracks. Null while loading; empty when this side has no access to them. */
function useSlideshowTracks(): AutoTrackDto[] | null {
  const client = useLabClient();
  const [tracks, setTracks] = useState<AutoTrackDto[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    client
      .request<{ tracks: AutoTrackDto[] }>('/auto-slideshow/music')
      .then((res) => { if (!cancelled) setTracks(res.ok ? res.data.tracks ?? [] : []); })
      .catch(() => { if (!cancelled) setTracks([]); });
    return () => { cancelled = true; };
  }, [client]);
  return tracks;
}

type Option = { value: string; label: string; audio: DeckAudio };

const randomItem = <T,>(items: T[]): T | undefined => items[Math.floor(Math.random() * items.length)];

/** One list: TikTok tracks first (with their best start), then every Assets Library track. */
function buildOptions(tracks: AutoTrackDto[] | null, audioAssets: BlitzAssetDto[]): Option[] {
  // Slideshow tracks carry an asset id; the card stores the R2 key, so map through the asset list.
  const tiktok = (tracks ?? []).flatMap((t) => {
    const asset = audioAssets.find((a) => a.id === t.assetId);
    return asset ? [{ value: `t:${t.assetId}`, label: `TikTok - ${t.name}`, audio: { assetKey: asset.r2Key, url: t.url, startAt: t.startAt, label: t.name } }] : [];
  });
  const assets = audioAssets.map((a) => ({ value: `a:${a.r2Key}`, label: `Asset - ${a.name}`, audio: { assetKey: a.r2Key, url: a.url, startAt: 0, label: a.name } }));
  return [...tiktok, ...assets];
}

export function DeckMusicPanel({ card, assets, onChange }: Props) {
  const tracks = useSlideshowTracks();
  const options = buildOptions(tracks, assets.filter((a) => a.type === 'AUDIO'));
  const currentKey = card?.audio?.assetKey;
  // Same file in both lists: prefer the TikTok entry (it carries the best start point).
  const value = options.find((o) => o.audio.assetKey === currentKey)?.value ?? '';
  const jevValue = card?.jevAudioKey ? options.find((o) => o.audio.assetKey === card.jevAudioKey)?.value : undefined;

  const pick = (optionValue: string) => {
    const option = options.find((o) => o.value === optionValue);
    if (card && option) onChange(card.id, option.audio);
  };

  /** Any other track, so a tap always changes the music. */
  const pickRandom = () => {
    const others = options.filter((o) => o.audio.assetKey !== currentKey);
    const option = randomItem(others);
    if (option) pick(option.value);
  };

  return (
    <section aria-label="Music" className="rounded-2xl border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="mb-3 flex items-center gap-1.5 text-[14px] font-semibold text-[var(--ink,#000)] dark:text-neutral-100">
        <Music aria-hidden className="h-4 w-4" /> Music
      </h2>
      {!card ? (
        <p className="text-[13px] text-[var(--mute,#7c7d82)]">No video on screen.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          <MusicSelect
            options={options}
            value={value}
            jevValue={jevValue}
            placeholder={tracks === null ? 'Loading…' : options.length ? 'Pick a track' : 'No tracks'}
            disabled={options.length === 0}
            onChange={pick}
          />
          <button
            type="button"
            onClick={pickRandom}
            disabled={options.length < 2}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--line,#e8e5e1)] bg-[var(--paper,#fff)] text-[14px] font-semibold text-[var(--ink,#000)] shadow-sm transition-all hover:bg-[var(--soft-2,#e6e1db)] active:scale-[.98] disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            <Shuffle aria-hidden className="h-4 w-4" /> Random
          </button>
          <p className="flex items-center gap-1.5 text-[12px] text-[var(--mute,#7c7d82)]">
            {!card.musicMatched ? 'Jev is picking the best track…'
              : card.jevAudioKey ? <><span aria-hidden className="h-2 w-2 flex-none rounded-full bg-[var(--ready,#1e8049)] dark:bg-emerald-400" /> = Jev&rsquo;s best fit. Your pick is used when you Generate.</>
              : 'Used when you Generate.'}
          </p>
        </div>
      )}
    </section>
  );
}
