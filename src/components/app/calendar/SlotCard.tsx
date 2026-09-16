'use client';

import { Check, ImageOff } from 'lucide-react';
import type { SlotDto } from '../../../types/business/calendar';
import { ScoreBadge } from '../postKit/ScoreBadge';

type Props = { slot: SlotDto; onOpen: (slot: SlotDto) => void };

/** One tap opens the post. The whole row is the target — thumbs are imprecise. */
export const SlotCard = ({ slot, onOpen }: Props) => {
  const posted = slot.status === 'posted';
  const hook = slot.photo?.postKit?.hook ?? slot.materialLabel ?? slot.photo?.batchName ?? 'Waiting for a photo';

  return (
    <button
      type="button"
      onClick={() => onOpen(slot)}
      className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition-colors duration-200 ${
        posted ? 'border-app-line bg-app-sunken/60' : 'border-app-line bg-app-panel hover:bg-app-sunken'
      } ${slot.status === 'skipped' ? 'opacity-50' : ''}`}
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-app-sunken">
        {slot.photo?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slot.photo.url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-app-muted"><ImageOff aria-hidden className="h-5 w-5" /></span>
        )}
        {posted && (
          <span className="absolute inset-0 flex items-center justify-center bg-emerald-600/70">
            <Check aria-hidden className="h-6 w-6 text-white" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-[14px] font-medium ${posted ? 'text-app-muted' : 'text-app-ink'}`}>{hook}</p>
        <p className="mt-0.5 truncate text-[12px] text-app-muted">
          {posted ? 'Posted' : slot.status === 'skipped' ? 'Skipped' : slot.slotOfDay === 'morning' ? 'Morning' : 'Evening'}
          {slot.photo?.scoreDetails?.bestFor ? ` · ${slot.photo.scoreDetails.bestFor}` : ''}
        </p>
      </div>

      {slot.photo?.score != null && !posted && <ScoreBadge score={slot.photo.score} />}
    </button>
  );
};
