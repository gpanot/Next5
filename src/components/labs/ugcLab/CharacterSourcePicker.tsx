'use client';

import type { UgcCharacterSource } from '../../../config/ugcLab';
import { Pill, labelClass } from './ui';

type CharacterSourcePickerProps = {
  source: UgcCharacterSource;
  hasJson: boolean;
  onChange: (source: UgcCharacterSource) => void;
};

/** Photo or JSON as the look input, so the same script can be run both ways and compared. */
export function CharacterSourcePicker({ source, hasJson, onChange }: CharacterSourcePickerProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className={labelClass}>Character input</span>
      <div className="flex flex-wrap items-center gap-2">
        <Pill active={source === 'image'} onClick={() => onChange('image')}>Photo</Pill>
        <Pill active={source === 'json'} onClick={() => onChange('json')} disabled={!hasJson}>JSON</Pill>
        <span className="text-[11px] text-muted">
          {!hasJson
            ? 'No JSON yet. Generate it under the photo in the Character step.'
            : source === 'json'
              ? 'No image sent. The model builds the person from the JSON only.'
              : 'The photo is sent to the model.'}
        </span>
      </div>
    </div>
  );
}
