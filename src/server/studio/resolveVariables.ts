/**
 * Campaign Studio v1 — Variable resolution.
 * Maps template variable keys to values from the brand profile, respecting the template's
 * `perspective` (business vs audience).
 *
 * business perspective → resolve from identity, positioning, market fields.
 * audience perspective → resolve from market.audienceDescription, tone, hooks.
 *
 * This is a pure function: no DB reads.
 */
// server-only
import type { StudioProfileData, ResolvedVar, VariableMap } from './types';

// ─── Key routing table ─────────────────────────────────────────────────────────

/** Keys that map to business identity fields. */
const BUSINESS_KEYS: Record<string, (p: StudioProfileData) => string | undefined> = {
  BUSINESS_NAME:   (p) => p.identity.businessName.value,
  BRAND_NAME:      (p) => p.identity.businessName.value,
  COMPANY_NAME:    (p) => p.identity.businessName.value,
  TAGLINE:         (p) => p.identity.tagline.value,
  KNOWN_THING:     (p) => p.positioning.promoting.value.split(' ').slice(0, 3).join(' ') || undefined,
  KNOWN_SERVICE:   (p) => p.positioning.promoting.value,
  SERVICE_LIST:    (p) => p.positioning.promoting.value,
  SERVICE_2:       (p) => p.positioning.promoting.value,
  SERVICE_3:       (p) => p.positioning.positioning.value,
  SERVICE_4:       (p) => p.positioning.offer.value,
  OFFER:           (p) => p.positioning.offer.value,
  POSITIONING:     (p) => p.positioning.positioning.value,
  GEOGRAPHY:       (p) => p.positioning.geography.value,
  CATEGORY:        (p) => p.classification.vertical.value.replace(/_/g, ' '),
  VERTICAL:        (p) => p.classification.vertical.value.replace(/_/g, ' '),
  HOOK:            (p) => p.tone.hooks.value[0],
  MISCONCEPTION:   (p) => `only ${p.positioning.promoting.value.split(' ').slice(0, 4).join(' ')}`,
};

/** Keys that map to audience/market fields. */
const AUDIENCE_KEYS: Record<string, (p: StudioProfileData) => string | undefined> = {
  AUDIENCE:        (p) => p.market.audienceDescription.value,
  TARGET_AUDIENCE: (p) => p.market.audienceDescription.value,
  PAIN_POINT:      (p) => p.tone.hooks.value[0],
  PROBLEM:         (p) => p.tone.hooks.value[0],
  DESIRE:          (p) => p.tone.hooks.value[1] ?? p.tone.hooks.value[0],
  OBJECTION:       (p) => p.tone.hooks.value[2] ?? p.tone.hooks.value[0],
  COMPETITOR:      (p) => p.market.competitors.value[0],
};

// ─── Resolver ─────────────────────────────────────────────────────────────────

/**
 * Resolves template variable keys to values from the profile.
 *
 * @param profile  Extracted brand profile data.
 * @param variableKeys  List of template variable keys to resolve.
 * @param perspective  'business' or 'audience' — which profile fields to prioritize.
 * @returns VariableMap with as many keys resolved as possible.
 */
export function resolveVariables(
  profile: StudioProfileData,
  variableKeys: string[],
  perspective: 'business' | 'audience',
): VariableMap {
  const map: VariableMap = {};

  for (const key of variableKeys) {
    const upper = key.toUpperCase();

    // 1. Try perspective-primary routing
    const primaryLookup = perspective === 'business' ? BUSINESS_KEYS : AUDIENCE_KEYS;
    const fallbackLookup = perspective === 'business' ? AUDIENCE_KEYS : BUSINESS_KEYS;

    let value = primaryLookup[upper]?.(profile);
    let source: ResolvedVar['source'] = 'profile';

    if (!value) {
      value = fallbackLookup[upper]?.(profile);
      source = 'profile';
    }

    if (!value) {
      // Generic fallback: try all profile fields
      value = profile.identity.businessName.value || profile.positioning.promoting.value;
      source = 'fallback';
    }

    if (value) {
      map[key] = { value, source };
    }
  }

  return map;
}
