'use client';

import { OCCASIONS, OCCASION_LABELS, type Occasion } from '../../../lib/listingOccasions';
import { ChipGroup } from '../../ui/Chip';

type Props = {
  value: Occasion | null;
  onChange: (occasion: Occasion) => void;
  /** Preselected from the Zillow listing status. */
  fromZillow?: boolean;
};

/**
 * What is happening with the home. Required, and never assumed for a home she uploaded:
 * only Zillow's own status preselects it (docs/business-studios/14-property-create-plan.md).
 */
export const OccasionPicker = ({ value, onChange, fromZillow = false }: Props) => (
  <div className="flex flex-col gap-2">
    <ChipGroup<Occasion | ''>
      options={OCCASIONS.map((o) => ({ value: o, label: OCCASION_LABELS[o] }))}
      value={value ?? ''}
      onChange={(v) => {
        if (v) onChange(v as Occasion);
      }}
    />
    {value && fromZillow && <p className="text-[12px] text-app-muted">From the Zillow listing. Change it if something new is happening.</p>}
    {!value && <p className="text-[12px] text-app-muted">Pick one. It sets your mood in the photos and the words of the post.</p>}
  </div>
);
