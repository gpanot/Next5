'use client';

import { MAX_CARD_BODY_CHARS, MAX_CARD_TITLE_CHARS, MIN_CAMPAIGN_CONTENT, type CampaignCard, type CampaignPhotoDto } from '../../../../types/admin/slideshowCampaign';
import { PhotoThumb } from './PhotoThumb';
import type { PendingPhoto } from './useCampaign';

type Props = {
  card: CampaignCard;
  /** Its place among the content cards (0-based); unused on the CTA. */
  position: number;
  contentCount: number;
  photos: CampaignPhotoDto[];
  /** The pick being copied in for this card, shown at once. */
  pending: PendingPhoto | null;
  onChange: (patch: Partial<CampaignCard>) => void;
  onPickPhoto: () => void;
  onRemove: () => void;
};

const field = 'w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-base text-white placeholder:text-white/40 focus:border-emerald-400 focus:outline-none';
const label = 'text-[11px] font-semibold tracking-widest text-white/50 uppercase';

/** A content or CTA card: its headline, one line under it and its one photo, the same in every slideshow. */
export function CardPanel({ card, position, contentCount, photos, pending, onChange, onPickPhoto, onRemove }: Props) {
  const isCta = card.role === 'cta';
  const photo = card.photo === null ? null : photos[card.photo];
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex shrink-0 items-end gap-2">
          {pending ? <PhotoThumb url={pending.thumbUrl} credit={null} loading /> : photo ? <PhotoThumb url={photo.url} credit={photo.credit} /> : <div className="h-28 w-16 rounded-lg border border-dashed border-white/20 bg-white/5" />}
          <button type="button" onClick={onPickPhoto} disabled={pending !== null} className="min-h-11 rounded-full border border-white/15 px-4 text-sm font-semibold text-white/85 transition active:scale-95 disabled:opacity-40">
            {pending ? 'Adding…' : photo ? 'Change photo' : 'Choose photo'}
          </button>
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <label className="block space-y-1.5">
            <span className={label}>Headline</span>
            <input value={card.title} maxLength={MAX_CARD_TITLE_CHARS} onChange={(e) => onChange({ title: e.target.value })} placeholder={isCta ? 'Follow for more golf tips' : 'Your point, in a few words'} className={`${field} min-h-11`} />
          </label>
          <label className="block space-y-1.5">
            <span className={label}>Text under it <span className="normal-case tracking-normal text-white/30">(optional)</span></span>
            <textarea value={card.body} maxLength={MAX_CARD_BODY_CHARS} rows={2} onChange={(e) => onChange({ body: e.target.value })} placeholder="The one detail that makes it land" className={`${field} resize-none`} />
          </label>
        </div>
      </div>
      <p className="text-sm text-white/45">One photo, no rotation: every slideshow of this campaign shows this slide the same way.</p>
      {!isCta && (
        <button type="button" onClick={onRemove} disabled={contentCount <= MIN_CAMPAIGN_CONTENT} className="min-h-11 rounded-full px-4 text-sm font-medium text-red-300 transition hover:bg-red-500/10 active:scale-95 disabled:opacity-30">
          Delete content slide {position + 1}
        </button>
      )}
    </div>
  );
}
