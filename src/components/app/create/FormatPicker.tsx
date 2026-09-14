'use client';

import { FORMAT_IDS, FORMATS, type FormatId } from '../../../config/formats';
import { Switch } from '../../ui/Switch';

type FormatPickerProps = {
  value: FormatId[];
  onChange: (next: FormatId[]) => void;
  highRes: boolean;
  onHighRes: (on: boolean) => void;
  highResAllowed: boolean;
};

export const FormatPicker = ({ value, onChange, highRes, onHighRes, highResAllowed }: FormatPickerProps) => (
  <div className="flex flex-col gap-4">
    <div role="group" aria-label="Formats" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {FORMAT_IDS.map((id) => {
        const on = value.includes(id);
        const f = FORMATS[id];
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? (value.length > 1 ? value.filter((v) => v !== id) : value) : [...value, id])}
            className={`flex flex-col items-center gap-2 rounded-2xl border p-3 transition-colors duration-200 ${on ? 'border-app-accent bg-app-accent-soft' : 'border-app-line hover:bg-app-sunken'}`}
          >
            <span className="flex h-14 items-end" aria-hidden>
              <span className={`block w-8 rounded-md border-2 ${on ? 'border-app-accent' : 'border-app-muted'}`} style={{ aspectRatio: f.cssAspect }} />
            </span>
            <span className="text-[14px] font-semibold tabular-nums text-app-ink">{f.ratio}</span>
            <span className="text-center text-[12px] text-app-muted">{f.label}</span>
          </button>
        );
      })}
    </div>
    <Switch
      checked={highRes && highResAllowed}
      disabled={!highResAllowed}
      onChange={onHighRes}
      label={<span className="text-[14px] text-app-ink">High-res 2K <span className="text-app-muted">— 2 photos each{highResAllowed ? '' : ' · included in Growth'}</span></span>}
    />
  </div>
);
