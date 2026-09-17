// server-only — never import from a 'use client' file.
// Prompt for her inside one photo of a real property. No set location and no theme scene:
// the room is the photo, the pose comes from the room, the mood from the occasion.
// Plan: docs/business-studios/14-property-create-plan.md.

import type { FormatId } from '../../../config/formats';
import { INDUSTRIES, POSE_ENERGIES, WARDROBES } from '../../../content/business/catalog/types';
import type { Occasion } from '../../../lib/listingOccasions';
import { BRAND_GUARDRAILS, QUALITY_BLOCK, formatBlock, identityBlock, join, materialBlock } from './blocks';
import { occasionDirection, roomPose } from './listingScenes';

export type ListingComposeInput = {
  identityImageCount: number;
  room: { kind: string; label: string | null; tag: string | null };
  /** 0-based look of this photo. */
  look: number;
  occasion: Occasion;
  wardrobe: string;
  poseEnergy: string;
  brandColors: readonly string[];
  industry: string | null;
  format: FormatId;
};

/** Said in every property prompt, after everything else, so nothing earlier can override it. */
export const PROPERTY_GUARDRAIL =
  'Keep the property exactly as photographed: do not open or close doors, move, add or remove furniture or objects, ' +
  'change walls, floors, fixtures, the view or the time of day. Only the person is added.';

const styling = (input: ListingComposeInput): string => {
  const wardrobe = WARDROBES.find((w) => w.id === input.wardrobe);
  const pose = POSE_ENERGIES.find((p) => p.id === input.poseEnergy);
  const industry = INDUSTRIES.find((i) => i.id === input.industry && i.id !== 'other');
  // On her outfit only. In a set this line may touch the décor; in her listing it may not.
  const colors = input.brandColors.length > 0
    ? `Use ${input.brandColors.join(' and ')} as a subtle accent in her outfit or accessories only.`
    : null;
  return [industry ? `She is a professional in ${industry.label.toLowerCase()}.` : null, wardrobe?.direction, pose?.direction, colors]
    .filter(Boolean)
    .join(' ');
};

/** Composes the prompt for one look of one property photo. Pure — tested. */
export const composeListingPrompt = (input: ListingComposeInput): string =>
  join(
    identityBlock(input.identityImageCount, false),
    materialBlock(input.identityImageCount + 1, input.room.kind, input.room.label),
    `Styling: ${styling(input)}`,
    `Pose: ${roomPose(input.room.tag, input.look)}`,
    `Mood: ${occasionDirection(input.occasion)}`,
    formatBlock(input.format),
    QUALITY_BLOCK,
    BRAND_GUARDRAILS,
    PROPERTY_GUARDRAIL,
  );
