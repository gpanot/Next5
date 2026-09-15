// Client-safe: consent types, the current version, and what each studio needs before onboarding goes on.

export const CONSENT_VERSION = '2026-09';

export const CONSENT_TYPES = ['terms', 'face_processing', 'ai_labeling'] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

/** Brand Studio makes photos of the user's face, so it also needs face processing. */
export const requiredConsents = (product: 'brand' | 'shop'): readonly ConsentType[] =>
  product === 'brand' ? ['terms', 'ai_labeling', 'face_processing'] : ['terms', 'ai_labeling'];

export const hasRequiredConsents = (product: 'brand' | 'shop', given: readonly string[]): boolean =>
  requiredConsents(product).every((type) => given.includes(type));
