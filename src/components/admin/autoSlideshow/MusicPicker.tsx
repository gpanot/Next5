'use client';

import { useRef, useState } from 'react';
import type { AutoSlideshowDto, AutoTrackDto } from '../../../types/admin/autoSlideshow';

type Props = { show: AutoSlideshowDto; tracks: AutoTrackDto[] | null; busy: string | null; onPick: (assetId: string | null) => void };

const field = 'min-h-11 w-full rounded-lg border border-white/15 bg-white/10 px-3 text-base text-white focus:border-white/50 focus:outline-none';

/**
 * Background music from the Assets Library. Plays in the preview and goes in the ZIP. TikTok's photo API cannot attach
 * it: posts sent from here get TikTok's own sound.
 */
export function MusicPicker({ show, tracks, busy, onPick }: Props) {
  const audio = useRef<HTMLAudioElement>(null);
  const [listening, setListening] = useState<string | null>(null);

  const listen = (track: AutoTrackDto | undefined) => {
    const a = audio.current;
    if (!a || !track) return;
    if (listening === track.assetId) {
      a.pause();
      setListening(null);
      return;
    }
    a.src = track.url;
    a.currentTime = track.startAt;
    void a.play().catch(() => undefined);
    setListening(track.assetId);
  };

  const current = tracks?.find((t) => t.assetId === show.audio?.assetId);
  // Jev's match goes first in the list, tagged, so it is easy to get back to after trying others.
  const recommended = tracks?.find((t) => t.assetId === show.recommendedAudioId);
  const others = tracks?.filter((t) => t !== recommended);

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold tracking-widest text-white/50 uppercase">Music · for reference</p>
      <div className="flex gap-2">
        <select
          aria-label="Background music"
          value={show.audio?.assetId ?? ''}
          disabled={busy !== null || tracks === null}
          onChange={(e) => onPick(e.target.value || null)}
          className={field}
        >
          <option value="">No music</option>
          {recommended && <option value={recommended.assetId}>Recommended · {recommended.name}</option>}
          {others?.map((t) => <option key={t.assetId} value={t.assetId}>{t.name}</option>)}
        </select>
        <button
          onClick={() => listen(current)}
          disabled={!current}
          aria-label={listening ? 'Stop' : 'Listen'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white transition active:scale-95 disabled:opacity-30"
        >
          {listening ? '■' : '▶'}
        </button>
      </div>
      {recommended && current?.assetId !== recommended.assetId && (
        <button
          onClick={() => onPick(recommended.assetId)}
          disabled={busy !== null}
          className="text-left text-[12px] text-white/60 underline underline-offset-2 transition active:opacity-60 disabled:opacity-30"
        >
          Use recommended: {recommended.name}
        </button>
      )}
      <p className="text-[11px] text-white/40">For the preview and the ZIP only. When we post, TikTok picks the music itself, often a trending sound that gets more views.</p>
      <audio ref={audio} onEnded={() => setListening(null)} />
    </div>
  );
}
