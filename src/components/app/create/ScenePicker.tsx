'use client';

import { Check } from 'lucide-react';
import Image from 'next/image';
import { hasManifestImage } from '../../../lib/manifest';
import type { SetTemplateDto } from '../../../types/business/catalog';
import { ScenePoseRow } from './ScenePoseRow';

/** Same caps as the server (MAX_SCENES_PER_BATCH, MAX_POSES_PER_SCENE). */
export const MAX_SCENES_PER_BATCH = 6;

export type ScenePick = { id: string; poseIds: string[] };

type Props = {
  scenes: readonly SetTemplateDto[];
  value: readonly ScenePick[];
  onChange: (next: ScenePick[]) => void;
};

/** A scene she adds starts with all its poses picked. */
export const withAllPoses = (scene: SetTemplateDto): ScenePick => ({ id: scene.id, poseIds: scene.poses.map((p) => p.id) });

const SceneTile = ({ scene, on, disabled, onToggle }: { scene: SetTemplateDto; on: boolean; disabled: boolean; onToggle: () => void }) => (
  <button type="button" aria-pressed={on} disabled={disabled} onClick={onToggle} className={`flex w-24 shrink-0 snap-start flex-col gap-1.5 rounded-xl p-1 text-left transition-colors duration-200 disabled:opacity-40 sm:w-28 ${on ? 'bg-app-accent-soft' : 'hover:bg-app-sunken'}`}>
    <span className={`relative block aspect-[4/5] overflow-hidden rounded-lg bg-app-sunken ring-2 ${on ? 'ring-app-accent' : 'ring-transparent'}`}>
      {hasManifestImage(scene.coverImage) && <Image src={scene.coverImage} alt="" fill sizes="(min-width: 640px) 112px, 96px" className="object-cover" />}
      {on && <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-app-cta text-app-cta-ink"><Check aria-hidden className="h-3.5 w-3.5" /></span>}
    </span>
    <span className="truncate px-0.5 text-[12px] font-medium text-app-ink">{scene.name}</span>
  </button>
);

/** Where she poses: one or more scenes, then the poses in each. */
export const ScenePicker = ({ scenes, value, onChange }: Props) => {
  const byId = (id: string) => scenes.find((s) => s.id === id);
  const toggle = (scene: SetTemplateDto) => {
    if (value.some((v) => v.id === scene.id)) {
      if (value.length > 1) onChange(value.filter((v) => v.id !== scene.id));
      return;
    }
    if (value.length < MAX_SCENES_PER_BATCH) onChange([...value, withAllPoses(scene)]);
  };
  const setPoses = (id: string, poseIds: string[]) => onChange(value.map((v) => (v.id === id ? { id, poseIds } : v)));

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Scenes" className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6">
        {scenes.map((scene) => {
          const on = value.some((v) => v.id === scene.id);
          return <SceneTile key={scene.id} scene={scene} on={on} disabled={!on && value.length >= MAX_SCENES_PER_BATCH} onToggle={() => toggle(scene)} />;
        })}
      </div>
      {value.map((pick) => {
        const scene = byId(pick.id);
        return scene && <ScenePoseRow key={pick.id} scene={scene} value={pick.poseIds} onChange={(ids) => setPoses(pick.id, ids)} onRemove={value.length > 1 ? () => toggle(scene) : undefined} />;
      })}
      <p className="text-[13px] text-app-muted">
        One photo per pose. Add more scenes to mix places, up to {MAX_SCENES_PER_BATCH}.
      </p>
    </div>
  );
};
