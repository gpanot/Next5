'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';
import type { CandidateDto } from '../../../types/business/listings';
import { AppButton } from '../../ui/AppButton';

type Props = {
  candidates: CandidateDto[];
  /** How many more photos the property can hold. */
  room: number;
  busy: boolean;
  error: string | null;
  onSubmit: (photoIds: string[]) => void;
};

const PhotoTile = ({ photo, picked, onToggle }: { photo: CandidateDto; picked: boolean; onToggle: () => void }) => (
  <li>
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={picked}
      aria-label={photo.tagLabel ?? 'Photo'}
      className={`relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-app-sunken ring-offset-2 ring-offset-app-panel transition duration-200 ${picked ? 'ring-2 ring-app-accent' : ''}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.thumbUrl} alt="" loading="lazy" className={`h-full w-full object-cover transition-opacity duration-200 ${photo.weak && !picked ? 'opacity-50' : ''}`} />
      <span className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border transition-colors duration-200 ${picked ? 'border-app-accent bg-app-accent text-app-accent-ink' : 'border-white/80 bg-black/30 text-transparent'}`}>
        <Check aria-hidden className="h-3.5 w-3.5" />
      </span>
    </button>
  </li>
);

/** Zillow photos not on the property: ones she removed, or new ones a refresh found. She picks which to add back. */
export const PickPhotosStep = ({ candidates, room, busy, error, onSubmit }: Props) => {
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) => setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : prev.length >= room ? prev : [...prev, id]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-app-ink">Add photos back from Zillow</h3>
        <span className="shrink-0 text-[13px] tabular-nums text-app-muted" aria-live="polite">{picked.length} picked</span>
      </div>
      {candidates.length === 0 ? (
        <p className="rounded-xl bg-app-sunken px-3 py-6 text-center text-[13px] text-app-muted">Every Zillow photo is already on this property.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {candidates.map((photo) => (
            <PhotoTile key={photo.id} photo={photo} picked={picked.includes(photo.id)} onToggle={() => toggle(photo.id)} />
          ))}
        </ul>
      )}
      {error && <p className="text-[13px] text-app-danger" role="alert">{error}</p>}
      <div className="sticky bottom-0 -mx-6 -mb-6 border-t border-app-line bg-app-panel px-6 py-4">
        <AppButton size="lg" fullWidth loading={busy} disabled={picked.length === 0} onClick={() => onSubmit(picked)}>
          {picked.length === 0 ? 'Pick photos to add' : `Add ${picked.length} photo${picked.length === 1 ? '' : 's'}`}
        </AppButton>
      </div>
    </div>
  );
};
