'use client';

import { useState } from 'react';
import { POSE_ENERGIES, WARDROBES, type PoseEnergyId, type WardrobeId } from '../../../content/business/catalog/types';
import { ChipGroup } from '../../ui/Chip';

export type Style = { wardrobe: WardrobeId | null; poseEnergy: PoseEnergyId | null };

type Props = {
  value: Style;
  onChange: (style: Style) => void;
  /** Her latest style's look, used when she has not changed it here. */
  fallback: { wardrobe: string | null; poseEnergy: string | null };
};

const label = <T extends string>(list: readonly { id: T; label: string }[], id: string | null): string | null =>
  list.find((i) => i.id === id)?.label ?? null;

/** How she looks, and nothing about the place: the property photo is the place. One line until she opens it. */
export const StyleLine = ({ value, onChange, fallback }: Props) => {
  const [open, setOpen] = useState(false);
  const outfit = label(WARDROBES, value.wardrobe ?? fallback.wardrobe);
  const energy = label(POSE_ENERGIES, value.poseEnergy ?? fallback.poseEnergy);
  const summary = [outfit, energy].filter(Boolean).join(' · ') || 'Your usual look';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[14px] text-app-ink">{summary}</p>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="shrink-0 text-[13px] font-medium text-app-accent hover:text-app-ink">
          {open ? 'Done' : 'Change'}
        </button>
      </div>
      {open && (
        <>
          <div className="flex flex-col gap-1.5">
            <p className="text-[12px] font-medium uppercase tracking-wide text-app-muted">Outfit</p>
            <ChipGroup<WardrobeId | ''>
              options={WARDROBES.map((w) => ({ value: w.id, label: w.label }))}
              value={value.wardrobe ?? (fallback.wardrobe as WardrobeId | null) ?? ''}
              onChange={(v) => v && onChange({ ...value, wardrobe: v as WardrobeId })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[12px] font-medium uppercase tracking-wide text-app-muted">Energy</p>
            <ChipGroup<PoseEnergyId | ''>
              options={POSE_ENERGIES.map((p) => ({ value: p.id, label: p.label }))}
              value={value.poseEnergy ?? (fallback.poseEnergy as PoseEnergyId | null) ?? ''}
              onChange={(v) => v && onChange({ ...value, poseEnergy: v as PoseEnergyId })}
            />
          </div>
        </>
      )}
    </div>
  );
};
