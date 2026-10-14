'use client';

import { cardPhotos, MAX_CARD_PHOTOS, type CampaignCard, type CampaignPhotoDto } from '../../../../types/admin/slideshowCampaign';
import { PhotoThumb } from './PhotoThumb';
import { HookPhotoCredits } from './UnsplashCredit';
import type { PendingPhoto } from './useCampaign';

type Props = {
  card: CampaignCard;
  photos: CampaignPhotoDto[];
  /** Picks being copied in for this card (its photo or its rotation), shown at once. */
  pending: PendingPhoto[];
  hookCount: number;
  onChange: (patch: Partial<CampaignCard>) => void;
  onAddPhotos: () => void;
};

/** How the card's photos pair with the hooks; the headline never changes. */
const rotationNote = (photos: number, hooks: number): string => {
  if (photos <= 1) return 'Same headline on every slideshow. Add more photos to change the background with each hook.';
  if (hooks <= 1) return `${photos} photos rotate with the hooks: add more hooks to use them all. The headline stays the same.`;
  const repeat = photos < hooks ? ` ${photos} photos repeat in turn.` : photos > hooks ? ` Only the first ${hooks} photos are used.` : '';
  return `Slideshow 1 shows photo 1, slideshow 2 photo 2, and so on.${repeat} The headline stays the same.`;
};

/**
 * A content slide's photos: the backgrounds rotate with the hooks (slideshow i shows photo i, looping), like the hook
 * photos, while the headline stays the same. One photo: the same background everywhere.
 */
export function CardPhotoRotation({ card, photos, pending, hookCount, onChange, onAddPhotos }: Props) {
  const list = cardPhotos(card);
  const full = list.length + pending.length >= MAX_CARD_PHOTOS;
  const remove = (i: number) => {
    const next = list.filter((_, j) => j !== i);
    onChange({ photo: next[0] ?? null, morePhotos: next.length > 1 ? next.slice(1) : undefined });
  };
  return (
    <section className="space-y-2">
      <p className="text-[11px] font-semibold tracking-widest text-white/50 uppercase">Background photos · rotate with the hooks</p>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <li>
          <button type="button" onClick={onAddPhotos} disabled={full} className="flex h-28 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/30 text-[11px] font-semibold text-white/80 transition active:scale-95 disabled:opacity-40">
            <span className="text-lg leading-none">+</span>
            Add
          </button>
        </li>
        {list.map((p, i) => (
          <li key={`${p}-${i}`}>
            <PhotoThumb url={photos[p]?.url ?? null} number={i + 1} onRemove={() => remove(i)} />
          </li>
        ))}
        {pending.map((p) => (
          <li key={p.key}>
            <PhotoThumb url={p.thumbUrl} loading />
          </li>
        ))}
      </ul>
      <HookPhotoCredits photoIndexes={list} photos={photos} />
      <p className="text-sm text-white/45">{rotationNote(list.length, hookCount)}</p>
    </section>
  );
}
