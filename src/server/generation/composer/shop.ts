// server-only — never import from a 'use client' file.

import type { FormatId } from '../../../config/formats';
import { SHOTS, type ShotId } from '../../../config/shots';
import type { SetTemplateConfig } from '../../../content/business/catalog/types';
import { QUALITY_BLOCK, SHOP_GUARDRAILS, formatBlock, garmentBlock, identityBlock, join, type GarmentInfo } from './blocks';

export type ShopComposeInput = {
  template: SetTemplateConfig;
  garment: GarmentInfo;
  shot: ShotId;
  format: FormatId;
  identityImageCount: number;
  productImageCount: number;
  isStudioModel: boolean;
};

/** Composes the prompt for one Shop Studio photo. Identity images come first, then product images. Pure. */
export const composeShopPrompt = (input: ShopComposeInput): string => {
  const firstProduct = input.identityImageCount + 1;
  const lastProduct = input.identityImageCount + input.productImageCount;
  const location = input.template.locations[0]?.direction ?? '';
  const shotDirection = input.template.shotOverrides?.[input.shot] ?? SHOTS[input.shot].direction;

  return join(
    identityBlock(input.identityImageCount, input.isStudioModel),
    garmentBlock(firstProduct, lastProduct, input.garment),
    `Setting: ${location} ${input.template.lighting}`,
    `Shot: ${shotDirection}`,
    formatBlock(input.format),
    QUALITY_BLOCK,
    SHOP_GUARDRAILS,
  );
};
