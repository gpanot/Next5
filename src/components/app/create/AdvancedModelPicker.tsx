'use client';

import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { REAPI_MODELS, SHOP_PICKABLE_MODELS, type ReapiModelId } from '../../../config/reapiModels';
import { Select } from '../../ui/Select';

type AdvancedModelPickerProps = {
  /** null: our default model. */
  value: ReapiModelId | null;
  onChange: (next: ReapiModelId | null) => void;
};

/** "Advanced" under Formats: collapsed by default, opens to pick the AI image model. */
export const AdvancedModelPicker = ({ value, onChange }: AdvancedModelPickerProps) => {
  const [open, setOpen] = useState(value !== null);
  const panelId = useId();
  const selectId = useId();
  const note = value ? REAPI_MODELS[value].note : 'The model we use for every drop.';

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 items-center gap-2 self-start rounded-xl px-1 text-[14px] font-medium text-app-muted transition-colors duration-200 hover:text-app-ink"
      >
        <ChevronDown aria-hidden className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        Advanced
      </button>
      {open && (
        <div id={panelId} className="flex flex-col gap-1.5 rounded-2xl border border-app-line bg-app-sunken p-3">
          <label htmlFor={selectId} className="text-[13px] font-medium text-app-ink">AI image model</label>
          <Select id={selectId} value={value ?? ''} onChange={(e) => onChange((e.target.value || null) as ReapiModelId | null)}>
            <option value="">Default</option>
            {SHOP_PICKABLE_MODELS.map((id) => <option key={id} value={id}>{REAPI_MODELS[id].label}</option>)}
          </Select>
          <p className="text-[12px] text-app-muted">{note}</p>
        </div>
      )}
    </div>
  );
};
