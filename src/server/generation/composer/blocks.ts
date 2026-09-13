// server-only — never import from a 'use client' file.
// Prompt text blocks. Spec: docs/business-studios/02-architecture.md §6.1. All prompts are English.

import { FORMATS, type FormatId } from '../../../config/formats';

export const identityBlock = (imageCount: number, isStudioModel: boolean): string => {
  const refs = imageCount === 1 ? 'Image 1 shows' : `Images 1 to ${imageCount} show`;
  const who = isStudioModel ? 'the model' : 'the person';
  return (
    `${refs} ${who}. Keep this exact person's face, facial structure, skin tone, hair colour and ` +
    'hairstyle unchanged and fully recognisable. Do not beautify, slim or alter any features or body shape.'
  );
};

export type GarmentInfo = {
  category: string;
  name: string;
  colorName: string | null;
  fit: string | null;
  notes: string | null;
};

export const garmentBlock = (firstImage: number, lastImage: number, garment: GarmentInfo): string => {
  const refs = firstImage === lastImage ? `Image ${firstImage} shows` : `Images ${firstImage} to ${lastImage} show`;
  const details = [
    garment.colorName ? `colour: ${garment.colorName}` : null,
    garment.fit ? `fit: ${garment.fit}` : null,
    garment.notes ? `notes: ${garment.notes}` : null,
  ]
    .filter(Boolean)
    .join('; ');
  return (
    `${refs} the product (${garment.category}: ${garment.name}${details ? `; ${details}` : ''}). ` +
    'The person must wear or carry this exact item: identical colour, pattern and print placement, fabric ' +
    'texture, neckline, sleeve length, hem length, buttons, zips, logos and fit. Do not add, remove or redesign ' +
    'any detail. Do not add other clothing items or accessories that hide the product.'
  );
};

export const formatBlock = (format: FormatId): string =>
  `Compose for a ${FORMATS[format].ratio} ${FORMATS[format].label.toLowerCase()} frame with safe margins; ` +
  'do not crop the subject at the joints.';

export const QUALITY_BLOCK =
  'Photorealistic commercial photography, natural skin texture, true-to-life colour, sharp focus. ' +
  'No text, no watermark, no logos, no brand names, no extra people facing the camera.';

export const BRAND_GUARDRAILS =
  'Do not include: awards, trophies, certificates, diplomas, "sold" signs, price tags, house numbers, company ' +
  'logos or brand names, identifiable faces of other people (other people must be out of frame, turned away ' +
  'or blurred), car badges, alcohol labels, children, medical imagery or uniforms of real companies.';

export const SHOP_GUARDRAILS =
  'Do not include: changes to the product, accessories that are not in the product photos, sexualised poses, ' +
  'brand logos that are not on the product, text overlays or other people.';

export const join = (...parts: readonly (string | null | undefined | false)[]): string =>
  parts.filter((part): part is string => typeof part === 'string' && part.trim().length > 0).join('\n\n');
