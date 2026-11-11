'use client';

import { MAX_NAME } from '../../../../types/admin/brandCast';
import type { DressCode } from './NewFaceDialog';

const DRESS_CODES: { id: DressCode; label: string; hint: string }[] = [
  { id: 'auto', label: 'Auto', hint: 'We pick clothes that fit your brand' },
  { id: 'photo', label: 'As per the photo', hint: 'We try to keep the same clothes' },
];

/** The tip shown before the owner picks a photo. */
export function StaffPhotoTip() {
  return <p className="rounded-xl bg-app-sunken px-3 py-2 text-sm text-app-muted">For best results, use a photo of one of your staff wearing your company dress code.</p>;
}

type Props = {
  name: string;
  dressCode: DressCode;
  onName: (name: string) => void;
  onDressCode: (dressCode: DressCode) => void;
};

/** What "Create an avatar" asks once a photo is picked: the person's name and what they wear. */
export function AvatarPhotoFields({ name, dressCode, onName, onDressCode }: Props) {
  return (
    <div className="space-y-4">
      <label className="block space-y-1.5">
        <span className="block text-sm font-semibold text-app-ink">Name</span>
        <input
          value={name}
          onChange={(e) => onName(e.target.value.replace(/,/g, '').slice(0, MAX_NAME))}
          autoComplete="off"
          placeholder="e.g. Maya"
          className="w-full rounded-xl border border-app-line bg-app-panel px-3 py-2.5 text-base text-app-ink transition focus:border-app-ink focus:outline-none sm:text-sm"
        />
      </label>
      <div className="space-y-1.5">
        <p id="dress-code-label" className="text-sm font-semibold text-app-ink">Dress code</p>
        <div role="radiogroup" aria-labelledby="dress-code-label" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DRESS_CODES.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={dressCode === option.id}
              onClick={() => onDressCode(option.id)}
              className={`min-h-14 rounded-xl border p-3 text-left transition active:scale-[0.98] ${dressCode === option.id ? 'border-app-ink bg-app-sunken' : 'border-app-line hover:bg-app-sunken'}`}
            >
              <span className="block text-sm font-semibold text-app-ink">{option.label}</span>
              <span className="block text-xs text-app-muted">{option.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
