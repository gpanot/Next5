// server-only — never import from a 'use client' file.

import { SHOTS } from '../../../config/shots';
import type { PoseSheetPose } from '../../../content/business/catalog/poseSheet';
import { SHOP_TEMPLATES } from '../../../content/business/catalog/templates';
import { QUALITY_BLOCK, formatBlock, identityBlock, join } from './blocks';

/** Plain clothes, so the sheet shows her body and poses, not an outfit that competes with the products. */
const BASICS = 'Outfit: a plain fitted white T-shirt, straight mid-blue jeans and clean white sneakers. No jewellery, no bag, no hat.';

const GUARDRAILS = 'Do not include: logos, text, props, sexualised poses, other people or accessories.';

/** One pose of a model's pose sheet: same basics, clean studio, one pose. Pure. */
export const composePoseSheetPrompt = (pose: PoseSheetPose, identityImageCount: number, isStudioModel: boolean): string => {
  const studio = SHOP_TEMPLATES.find((t) => t.id === 'clean-white')!.config;
  return join(
    identityBlock(identityImageCount, isStudioModel),
    BASICS,
    `Setting: ${studio.locations[0]?.direction ?? ''} ${studio.lighting}`,
    `Shot: ${SHOTS[pose].direction}`,
    formatBlock('portrait_4_5'),
    QUALITY_BLOCK,
    GUARDRAILS,
  );
};

