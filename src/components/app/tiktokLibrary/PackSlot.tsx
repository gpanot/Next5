'use client';

import { ArrowLeft, ArrowRight, Minus, Plus } from 'lucide-react';
import type { PackPhotoDto } from '../../../types/business/shop';
import { ScoreBadge } from '../postKit/ScoreBadge';

type SlotProps = { mode: 'slot'; index: number; count: number; onMove: (dir: -1 | 1) => void; onRemove: () => void };
type ExtraProps = { mode: 'extra'; onAdd: () => void; /** The pack already has 9 photos. */ full: boolean };
type Props = { photo: PackPhotoDto; busy: boolean } & (SlotProps | ExtraProps);

const FORMAT_LABEL: Record<string, string> = { square_1_1: '1:1', portrait_4_5: '4:5', portrait_3_4: '3:4', story_9_16: '9:16' };

const iconButton = 'flex h-9 w-9 items-center justify-center rounded-full text-app-muted transition-colors duration-200 hover:bg-app-sunken hover:text-app-ink disabled:opacity-30';

/**
 * One photo card in the TikTok library. The same card is used in the pack (numbered, move / Remove)
 * and outside it (Add), so a removed photo looks exactly like it did in the pack.
 */
export const PackSlot = (props: Props) => {
  const { photo, busy } = props;
  const inPack = props.mode === 'slot';
  return (
    <figure className={`flex flex-col overflow-hidden rounded-2xl border bg-app-panel transition-colors duration-200 ${inPack ? 'border-app-line' : 'border-dashed border-app-line'}`}>
      <div className="relative aspect-square bg-app-sunken">
        {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
        {photo.url && <img src={photo.url} alt={inPack ? `Slot ${props.index + 1}` : 'Photo not in the pack'} className={`h-full w-full object-cover transition-opacity duration-200 ${inPack ? '' : 'opacity-70'}`} loading="lazy" />}
        {inPack && <span className="absolute left-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-app-ink px-2 text-[12px] font-semibold text-app-panel">{props.index === 0 ? '1 · Main' : props.index + 1}</span>}
        {photo.score !== null && <ScoreBadge score={photo.score} className="absolute right-2 top-2" />}
        <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white">{FORMAT_LABEL[photo.format] ?? photo.format}</span>
      </div>
      <figcaption className="flex min-h-11 items-center justify-between gap-1 px-1.5 py-1">
        {inPack ? (
          <>
            <div className="flex">
              <button type="button" aria-label={`Move slot ${props.index + 1} earlier`} disabled={busy || props.index === 0} onClick={() => props.onMove(-1)} className={iconButton}><ArrowLeft aria-hidden className="h-4 w-4" /></button>
              <button type="button" aria-label={`Move slot ${props.index + 1} later`} disabled={busy || props.index === props.count - 1} onClick={() => props.onMove(1)} className={iconButton}><ArrowRight aria-hidden className="h-4 w-4" /></button>
            </div>
            <button type="button" aria-label={`Remove slot ${props.index + 1} from the pack`} disabled={busy} onClick={props.onRemove} className="flex h-9 items-center gap-1 rounded-full px-3 text-[13px] font-medium text-app-muted transition-colors duration-200 hover:bg-app-sunken hover:text-app-ink disabled:opacity-30"><Minus aria-hidden className="h-4 w-4" /> Remove</button>
          </>
        ) : (
          <button type="button" disabled={busy || props.full} onClick={props.onAdd} title={props.full ? 'The pack has 9 photos. Remove one first.' : undefined} className="flex h-9 w-full items-center justify-center gap-1 rounded-full text-[13px] font-medium text-app-accent transition-colors duration-200 hover:bg-app-accent-soft disabled:text-app-muted disabled:opacity-60"><Plus aria-hidden className="h-4 w-4" /> {props.full ? 'Pack is full' : 'Add to pack'}</button>
        )}
      </figcaption>
    </figure>
  );
};
