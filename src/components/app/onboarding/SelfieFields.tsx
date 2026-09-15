'use client';

import { Checkbox } from '../../ui/Checkbox';
import { PhotoSlot } from '../shared/PhotoSlot';
import { GuideImages, SELFIE_GUIDES } from './GuideImages';
import type { SelfieUpload } from './useSelfieUpload';

/** The photo slots, tips and (when needed) the face consent for "photos of me". */
export const SelfieFields = ({ upload }: { upload: SelfieUpload }) => (
  <div className="flex flex-col gap-4">
    <div className="grid grid-cols-3 gap-3">
      {upload.slots.map((slot, i) => (
        <PhotoSlot
          key={slot.label}
          label={slot.label}
          hint={slot.required ? undefined : 'Optional'}
          capture={slot.capture}
          previewUrl={upload.photos[i]?.previewUrl ?? null}
          onFile={(file, previewUrl) => upload.setPhoto(i, { file, previewUrl })}
        />
      ))}
    </div>
    <GuideImages guides={SELFIE_GUIDES} />
    {upload.needsConsent && (
      <Checkbox checked={upload.consent} onChange={upload.setConsent} label={<span className="text-[14px] text-app-ink">These are photos of me and I agree that Next5 processes my face to create photos.</span>} />
    )}
    {upload.error && <p role="alert" className="text-[14px] text-app-danger">{upload.error}</p>}
  </div>
);
