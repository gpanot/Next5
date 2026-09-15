'use client';

import { ArrowLeft, ArrowRight, EyeOff } from 'lucide-react';
import type { PackPhotoDto } from '../../../types/business/shop';
import { ScoreBadge } from '../postKit/ScoreBadge';

type Props = { photo: PackPhotoDto; index: number; count: number; busy: boolean; onMove: (dir: -1 | 1) => void; onHide: () => void };

const FORMAT_LABEL: Record<string, string> = { square_1_1: '1:1', portrait_4_5: '4:5', portrait_3_4: '3:4', story_9_16: '9:16' };

/** One numbered slot in TikTok upload order. Move with the arrow buttons (keyboard friendly, no drag needed). */
export const PackSlot = ({ photo, index, count, busy, onMove, onHide }: Props) => (
  <figure className="flex flex-col overflow-hidden rounded-2xl border border-app-line bg-app-panel">
    <div className="relative aspect-square bg-app-sunken">
      {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
      {photo.url && <img src={photo.url} alt={`Slot ${index + 1}`} className="h-full w-full object-cover" loading="lazy" />}
      <span className="absolute left-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-app-ink px-2 text-[12px] font-semibold text-white">{index === 0 ? '1 · Main' : index + 1}</span>
      {photo.score !== null && <ScoreBadge score={photo.score} className="absolute right-2 top-2" />}
      <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white">{FORMAT_LABEL[photo.format] ?? photo.format}</span>
    </div>
    <figcaption className="flex items-center justify-between px-1.5 py-1">
      <div className="flex">
        <button type="button" aria-label={`Move slot ${index + 1} earlier`} disabled={busy || index === 0} onClick={() => onMove(-1)} className="flex h-9 w-9 items-center justify-center rounded-full text-app-muted transition-colors duration-200 hover:bg-app-sunken hover:text-app-ink disabled:opacity-30"><ArrowLeft aria-hidden className="h-4 w-4" /></button>
        <button type="button" aria-label={`Move slot ${index + 1} later`} disabled={busy || index === count - 1} onClick={() => onMove(1)} className="flex h-9 w-9 items-center justify-center rounded-full text-app-muted transition-colors duration-200 hover:bg-app-sunken hover:text-app-ink disabled:opacity-30"><ArrowRight aria-hidden className="h-4 w-4" /></button>
      </div>
      <button type="button" aria-label={`Remove slot ${index + 1} from the pack`} disabled={busy} onClick={onHide} className="flex h-9 items-center gap-1 rounded-full px-2 text-[12px] text-app-muted transition-colors duration-200 hover:bg-app-sunken hover:text-app-ink disabled:opacity-30"><EyeOff aria-hidden className="h-4 w-4" /> Remove</button>
    </figcaption>
  </figure>
);
