'use client';

import { POSE_ENERGIES, WARDROBES } from '../../../../content/business/catalog/types';
import type { SetTemplateDto } from '../../../../types/business/catalog';
import { Chip, ChipGroup } from '../../../ui/Chip';
import { ColorInput } from '../../../ui/ColorInput';
import { Field } from '../../../ui/Field';
import { Switch } from '../../../ui/Switch';

export type BrandStyle = { locations: string[]; wardrobe: string; poseEnergy: string; brandColors: string[] };

export const defaultStyle = (template: SetTemplateDto | null): BrandStyle => ({
  locations: template?.locations.slice(0, 2).map((l) => l.id) ?? [],
  wardrobe: template?.defaults.wardrobe ?? 'smart_casual',
  poseEnergy: template?.defaults.poseEnergy ?? 'warm_approachable',
  brandColors: [],
});

type StyleOptionsProps = { template: SetTemplateDto; value: BrandStyle; onChange: (next: BrandStyle) => void };

export const StyleOptions = ({ template, value, onChange }: StyleOptionsProps) => {
  const toggleLocation = (id: string) => {
    const has = value.locations.includes(id);
    if (has && value.locations.length === 1) return;
    const next = has ? value.locations.filter((l) => l !== id) : [...value.locations, id].slice(-3);
    onChange({ ...value, locations: next });
  };

  return (
    <div className="flex flex-col gap-6">
      <Field label="Locations" helper="Pick 1 to 3. Your photos rotate between them.">
        <div role="group" className="flex flex-wrap gap-2">
          {template.locations.map((l) => <Chip key={l.id} selected={value.locations.includes(l.id)} onClick={() => toggleLocation(l.id)}>{l.label}</Chip>)}
        </div>
      </Field>
      <Field label="Wardrobe">
        <ChipGroup options={WARDROBES.map((w) => ({ value: w.id, label: w.label }))} value={value.wardrobe} onChange={(v) => onChange({ ...value, wardrobe: String(v) })} />
      </Field>
      <Field label="Energy">
        <ChipGroup options={POSE_ENERGIES.map((p) => ({ value: p.id, label: p.label }))} value={value.poseEnergy} onChange={(v) => onChange({ ...value, poseEnergy: String(v) })} />
      </Field>
      <Field label="Brand colours" helper="Optional — used as subtle accents.">
        <div className="flex flex-col gap-3">
          <Switch checked={value.brandColors.length > 0} onChange={(on) => onChange({ ...value, brandColors: on ? ['#1f3a5f'] : [] })} label="Use my brand colours" />
          {value.brandColors.length > 0 && (
            <div className="flex gap-4">
              {[0, 1].map((i) => (
                <ColorInput key={i} label={`Brand colour ${i + 1}`} value={value.brandColors[i] ?? '#b8683f'} onChange={(c) => { const next = [...value.brandColors]; next[i] = c; onChange({ ...value, brandColors: next.slice(0, 2) }); }} />
              ))}
            </div>
          )}
        </div>
      </Field>
    </div>
  );
};
