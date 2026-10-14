'use client';

import { MAX_CARD_TITLE_CHARS, MIN_CAMPAIGN_CONTENT, type CampaignCard, type CampaignPhotoDto } from '../../../../types/admin/slideshowCampaign';
import { CardPhotoRotation } from './CardPhotoRotation';
import { PhotoThumb } from './PhotoThumb';
import { StoreBadgePicker } from './StoreBadgePicker';
import { UnsplashCredit } from './UnsplashCredit';
import type { PendingPhoto } from './useCampaign';

type Props = {
  card: CampaignCard;
  /** Its place among the content cards (0-based); unused on the CTA. */
  position: number;
  contentCount: number;
  photos: CampaignPhotoDto[];
  /** The pick being copied in for this card, shown at once. */
  pending: PendingPhoto | null;
  /** Picks being added to a content card's rotation. */
  rotationPending: PendingPhoto[];
  hookCount: number;
  onChange: (patch: Partial<CampaignCard>) => void;
  /** Whether the content headlines carry numbers ("1. …"); the switch adds or removes them on every content slide. */
  numbered: boolean;
  onNumbered: (on: boolean) => void;
  onPickPhoto: () => void;
  /** Adds photos to a content card's rotation. */
  onAddPhotos: () => void;
  onRemove: () => void;
};

const field = 'w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-base text-white placeholder:text-white/40 focus:border-emerald-400 focus:outline-none';
const label = 'text-[11px] font-semibold tracking-widest text-white/50 uppercase';
const chipClass = (on: boolean) =>
  `min-h-11 rounded-full border px-4 text-sm font-semibold transition active:scale-95 ${on ? 'border-emerald-400 bg-emerald-400/10 text-white' : 'border-white/10 text-white/50 hover:border-white/25 hover:text-white/80'}`;

/** Numbered or Plain, for every content slide at once: only the text changes, no AI. */
function NumberedSwitch({ numbered, onPick }: { numbered: boolean; onPick: (on: boolean) => void }) {
  return (
    <div className="space-y-1.5">
      <span className={label}>Format · every content slide</span>
      <div role="radiogroup" aria-label="Format" className="flex gap-2">
        <button type="button" role="radio" aria-checked={numbered} onClick={() => onPick(true)} className={chipClass(numbered)}>Numbered</button>
        <button type="button" role="radio" aria-checked={!numbered} onClick={() => onPick(false)} className={chipClass(!numbered)}>Plain</button>
      </div>
    </div>
  );
}

/** The CTA's one photo, the same in every slideshow. */
function CtaPhoto({ photo, pending, onPickPhoto }: { photo: CampaignPhotoDto | null; pending: PendingPhoto | null; onPickPhoto: () => void }) {
  return (
    <div className="flex shrink-0 items-end gap-2">
      {pending ? <PhotoThumb url={pending.thumbUrl} loading /> : photo ? <PhotoThumb url={photo.url} /> : <div className="h-28 w-16 rounded-lg border border-dashed border-white/20 bg-white/5" />}
      <button type="button" onClick={onPickPhoto} disabled={pending !== null} className="min-h-11 rounded-full border border-white/15 px-4 text-sm font-semibold text-white/85 transition active:scale-95 disabled:opacity-40">
        {pending ? 'Adding…' : photo ? 'Change photo' : 'Choose photo'}
      </button>
    </div>
  );
}

/** A content or CTA card: its headline (the same in every slideshow) and its photos: a content card's backgrounds rotate
 *  with the hooks, the CTA keeps one. (The line under the headline is hidden for now, see SHOW_CARD_BODY.) */
export function CardPanel({ card, position, contentCount, photos, pending, rotationPending, hookCount, onChange, numbered, onNumbered, onPickPhoto, onAddPhotos, onRemove }: Props) {
  const isCta = card.role === 'cta';
  const photo = card.photo === null ? null : photos[card.photo] ?? null;
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        {isCta && <CtaPhoto photo={photo} pending={pending} onPickPhoto={onPickPhoto} />}
        <div className="min-w-0 flex-1 space-y-3">
          <label className="block space-y-1.5">
            <span className={label}>Headline</span>
            <input value={card.title} maxLength={MAX_CARD_TITLE_CHARS} onChange={(e) => onChange({ title: e.target.value })} placeholder={isCta ? 'Follow for more golf tips' : 'Your point, in a few words'} className={`${field} min-h-11`} />
          </label>
          {isCta ? <StoreBadgePicker badges={card.badges} onChange={(badges) => onChange({ badges })} /> : <NumberedSwitch numbered={numbered} onPick={onNumbered} />}
        </div>
      </div>
      {isCta ? (
        <>
          {!pending && photo?.credit && <UnsplashCredit credit={photo.credit} className="block text-xs text-white/60" />}
          <p className="text-sm text-white/45">One photo, no rotation: every slideshow of this campaign ends on this slide.</p>
        </>
      ) : (
        <CardPhotoRotation card={card} photos={photos} pending={[...(pending ? [pending] : []), ...rotationPending]} hookCount={hookCount} onChange={onChange} onAddPhotos={onAddPhotos} />
      )}
      {!isCta && (
        <button type="button" onClick={onRemove} disabled={contentCount <= MIN_CAMPAIGN_CONTENT} className="min-h-11 rounded-full px-4 text-sm font-medium text-red-300 transition hover:bg-red-500/10 active:scale-95 disabled:opacity-30">
          Delete content slide {position + 1}
        </button>
      )}
    </div>
  );
}
