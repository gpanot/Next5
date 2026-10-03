// server-only — never import from a 'use client' file.
// The shared company profile (StudioProfileData, also used by Blitz) → the flat BrandProfile that Auto Slideshow's
// steps read (levers, bank, write, music, photos, render). One extractor, two shapes.

import type { BrandProfile } from '../../types/admin/companyIntel';
import { domainOf } from '../companyIntel/profile';
import type { StudioProfileData } from './types';

const text = (value: string | null | undefined): string => (value ?? '').trim();

export function toBrandProfile(data: StudioProfileData, sourceUrl: string): BrandProfile {
  const subVertical = text(data.classification.subVertical.value);
  const style = data.visual?.slideshowStyle.value ?? null;
  const brand = data.brand;
  return {
    brandName: text(data.identity.businessName.value),
    domain: domainOf(sourceUrl),
    // The brand summary reads like the old Auto Slideshow profile; Blitz's short fields are the fallback.
    valueProp: text(brand?.valueProp.value) || text(data.positioning.promoting.value) || text(data.positioning.offer.value),
    audience: text(brand?.audience.value) || text(data.market.audienceDescription.value),
    tone: text(brand?.tone.value) || text(data.tone.tone.value).replace(/_/g, ' '),
    productCategories: brand?.productCategories.value.length ? brand.productCategories.value : subVertical ? [subVertical] : [],
    searchKeywords: data.market.keywords.value,
    palette: data.visual?.palette.value ?? [],
    heroImageUrl: data.visual?.heroImageUrl.value ?? null,
    faviconUrl: data.visual?.faviconUrl.value ?? null,
    pageTitle: null,
    pageExcerpt: data.siteText ?? '',
    ...(style ? { slideshowStyle: style } : {}),
  };
}
