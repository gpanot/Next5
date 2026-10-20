'use client';

import type { KeyboardEvent } from 'react';
import type { AutoTrackDto } from '../../../types/admin/autoSlideshow';
import { useAdminApi } from '../business/useAdminApi';

/** Music in the Brand Cast and Hooks Volume editors alike: the picker and the player's sound. Off hides both in both. */
export const SHOW_MUSIC = true;

type Props = {
  /** The picked track's asset id; null = no music. */
  value: string | null;
  /** Jev's match for this slideshow, listed first and tagged. */
  recommendedId?: string | null;
  tracks: AutoTrackDto[] | null;
  busy?: boolean;
  onPick: (assetId: string | null) => void;
  /** One row under the preview: no title, the note in a tooltip. */
  compact?: boolean;
};

const NOTE = 'For the preview and the ZIP only. When we post, TikTok picks the music itself, often a trending sound that gets more views.';

const field = 'min-h-11 w-full rounded-lg border border-white/15 bg-white/10 px-3 text-base text-white focus:border-white/50 focus:outline-none';

/** The Assets Library's tracks, loaded only while music shows and `enabled` (an editor is open). */
export function useMusicTracks(token: string, enabled = true): AutoTrackDto[] | null {
  const music = useAdminApi<{ tracks: AutoTrackDto[] }>(token, SHOW_MUSIC && enabled ? '/api/admin/auto-slideshow/music' : null);
  return music.data?.tracks ?? null;
}

const trackLabel = (t: AutoTrackDto) => (t.tiktok ? `${t.name} (TikTok)` : t.name);

/**
 * Up/Down on the focused picker steps to the previous/next track at once, without opening the list
 * (browsers otherwise open it, or wait for Enter). `order` is the list as shown, "No music" first.
 */
const stepOnArrow = (e: KeyboardEvent<HTMLSelectElement>, order: Array<string | null>, value: string | null, onPick: (assetId: string | null) => void) => {
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  e.preventDefault();
  const at = order.indexOf(value);
  const next = order[Math.min(order.length - 1, Math.max(0, at + (e.key === 'ArrowDown' ? 1 : -1)))];
  if (next !== value) onPick(next);
};

/** The player's sound for a picked track: none while music is hidden. */
export const playerAudio = (value: string | null | undefined, tracks: AutoTrackDto[] | null): AutoTrackDto | null =>
  (SHOW_MUSIC && value ? tracks?.find((t) => t.assetId === value) : null) ?? null;

/**
 * Background music from the Assets Library, shared by the Brand Cast and Hooks Volume editors. Plays with the preview
 * (its play button) and goes in the ZIP. TikTok's photo API cannot attach it: posts sent from here get TikTok's own sound.
 * Renders nothing while SHOW_MUSIC is off.
 */
export function SlideshowMusic({ value, recommendedId = null, tracks, busy = false, onPick, compact = false }: Props) {
  if (!SHOW_MUSIC) return null;
  // The recommended track goes first in the list, so it is easy to get back to after trying others.
  const recommended = tracks?.find((t) => t.assetId === recommendedId);
  // TikTok sounds first, our own library sounds at the bottom; by name within each (the API sorts by name).
  const others = tracks?.filter((t) => t !== recommended).sort((a, b) => Number(!a.tiktok) - Number(!b.tiktok)) ?? [];
  const order = [null, ...(recommended ? [recommended] : []), ...others].map((t) => t?.assetId ?? null);

  return (
    <div className={compact ? 'mx-auto mt-3 w-full max-w-xs space-y-2' : 'space-y-2'} title={compact ? NOTE : undefined}>
      {!compact && <p className="text-[11px] font-semibold tracking-widest text-white/50 uppercase">Music · for reference</p>}
      <select aria-label="Background music" value={value ?? ''} disabled={busy || tracks === null} onChange={(e) => onPick(e.target.value || null)} onKeyDown={(e) => stepOnArrow(e, order, value, onPick)} className={field}>
        <option value="">No music</option>
        {recommended && <option value={recommended.assetId}>Recommended · {trackLabel(recommended)}</option>}
        {others.map((t) => <option key={t.assetId} value={t.assetId}>{trackLabel(t)}</option>)}
      </select>
      {recommended && value !== recommended.assetId && (
        <button
          type="button"
          onClick={() => onPick(recommended.assetId)}
          disabled={busy}
          className="text-left text-[12px] text-white/60 underline underline-offset-2 transition active:opacity-60 disabled:opacity-30"
        >
          Use recommended: {trackLabel(recommended)}
        </button>
      )}
      {!compact && <p className="text-[11px] text-white/40">{NOTE}</p>}
    </div>
  );
}
