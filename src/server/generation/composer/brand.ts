// server-only — never import from a 'use client' file.

import type { FormatId } from '../../../config/formats';
import {
  INDUSTRIES,
  POSE_ENERGIES,
  WARDROBES,
  type SetTemplateConfig,
  type ThemeScene,
} from '../../../content/business/catalog/types';
import { BRAND_GUARDRAILS, QUALITY_BLOCK, formatBlock, identityBlock, join, materialBlock } from './blocks';

export type BrandComposeInput = {
  template: SetTemplateConfig;
  set: { locations: readonly string[]; wardrobe: string | null; poseEnergy: string | null; brandColors: readonly string[] };
  scene: ThemeScene;
  /** 0-based index of the photo inside the batch — picks the location and variation. */
  index: number;
  sceneCount: number;
  format: FormatId;
  industry: string | null;
  identityImageCount: number;
  /** Drop box: her own photo of the place, used as the setting instead of the set's stock location. */
  material?: { kind: string; label: string | null } | null;
};

const pickLocation = (input: BrandComposeInput): string => {
  const chosen = input.template.locations.filter((l) => input.set.locations.includes(l.id));
  const pool = chosen.length > 0 ? chosen : input.template.locations;
  return pool[input.index % pool.length]?.direction ?? '';
};

const styleBlock = (input: BrandComposeInput): string => {
  const wardrobe = WARDROBES.find((w) => w.id === (input.set.wardrobe ?? input.template.defaults.wardrobe));
  const pose = POSE_ENERGIES.find((p) => p.id === (input.set.poseEnergy ?? input.template.defaults.poseEnergy));
  const industry = INDUSTRIES.find((i) => i.id === input.industry && i.id !== 'other');
  const colors = input.set.brandColors.length > 0
    ? `Use ${input.set.brandColors.join(' and ')} as subtle accent colours (an accessory, a detail in the décor), never overwhelming.`
    : null;
  return join(
    industry ? `She is a professional in ${industry.label.toLowerCase()}.` : null,
    wardrobe?.direction,
    pose?.direction,
    colors,
  ).replace(/\n\n/g, ' ');
};

/** Composes the prompt for one Brand Studio photo. Pure — snapshot-tested. */
export const composeBrandPrompt = (input: BrandComposeInput): string => {
  const variation = Math.floor(input.index / Math.max(1, input.sceneCount));
  const variationNote = variation > 0 ? ` Variation ${variation + 1}: use a different pose, angle and framing than before.` : '';
  return join(
    identityBlock(input.identityImageCount, false),
    input.material
      ? materialBlock(input.identityImageCount + 1, input.material.kind, input.material.label)
      : `Setting: ${pickLocation(input)} ${input.template.lighting}`,
    `Styling: ${styleBlock(input)}`,
    `Scene: ${input.scene.direction}${variationNote}`,
    formatBlock(input.format),
    QUALITY_BLOCK,
    BRAND_GUARDRAILS,
  );
};
