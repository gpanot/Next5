'use client';

import { Check, X } from 'lucide-react';
import Image from 'next/image';
import { hasManifestImage } from '../../../lib/manifest';
import type { SetTemplateDto } from '../../../types/business/catalog';

type Props = {
  scene: SetTemplateDto;
  /** Picked pose ids. At least one stays picked. */
  value: readonly string[];
  onChange: (poseIds: string[]) => void;
  /** Missing when this is her only scene. */
  onRemove?: () => void;
};

const toggle = (value: readonly string[], id: string): string[] =>
  value.includes(id) ? (value.length > 1 ? value.filter((v) => v !== id) : [...value]) : [...value, id];

/** One picked scene: its poses as sample photos. Tap a pose to leave it out. */
export const ScenePoseRow = ({ scene, value, onChange, onRemove }: Props) => (
  <section aria-label={`${scene.name} poses`} className="flex flex-col gap-2 rounded-2xl bg-app-sunken/60 p-3">
    <header className="flex items-center gap-2">
      <h3 className="min-w-0 flex-1 truncate text-[14px] font-semibold text-app-ink">
        {scene.name} <span className="font-normal text-app-muted">· {value.length} of {scene.poses.length} poses</span>
      </h3>
      <button type="button" onClick={() => onChange(value.length === scene.poses.length ? [scene.poses[0]!.id] : scene.poses.map((p) => p.id))} className="h-8 rounded-full px-2.5 text-[12px] font-medium text-app-accent transition-colors duration-200 hover:bg-app-panel">
        {value.length === scene.poses.length ? 'Only one' : 'All'}
      </button>
      {onRemove && (
        <button type="button" aria-label={`Remove ${scene.name}`} onClick={onRemove} className="flex h-8 w-8 items-center justify-center rounded-full text-app-muted transition-colors duration-200 hover:bg-app-panel hover:text-app-ink">
          <X aria-hidden className="h-4 w-4" />
        </button>
      )}
    </header>
    <ul className="-mx-3 flex snap-x gap-2 overflow-x-auto px-3 [scrollbar-width:none]">
      {scene.poses.map((pose) => {
        const on = value.includes(pose.id);
        return (
          <li key={pose.id} className="w-[28%] shrink-0 snap-start sm:w-28">
            <button type="button" aria-pressed={on} onClick={() => onChange(toggle(value, pose.id))} className="flex w-full flex-col gap-1 text-left">
              <span className={`relative block aspect-[4/5] overflow-hidden rounded-lg bg-app-sunken ring-2 transition-opacity duration-200 ${on ? 'ring-app-accent' : 'opacity-50 ring-transparent'}`}>
                {hasManifestImage(pose.image) && <Image src={pose.image} alt="" fill sizes="(min-width: 640px) 112px, 28vw" className="object-cover" />}
                {on && <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-app-cta text-app-cta-ink"><Check aria-hidden className="h-3.5 w-3.5" /></span>}
              </span>
              <span className="truncate px-0.5 text-[12px] text-app-ink">{pose.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  </section>
);
