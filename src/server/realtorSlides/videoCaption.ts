// server-only — never import from a 'use client' file.
// Caption of a playbook listing video post: facts from the listing only (nothing to invent, nothing to steer), the
// moment line, the keyword CTA and the brokerage line. Written at approve, so the calendar slot gets it when booked.

import type { Listing } from '@prisma/client';
import { withDisclosure } from '../../lib/playbookMoment';
import { CTA_LINES, type Beat } from '../../lib/realtorPlaybooks';

type Address = { street?: string | null; city?: string | null; state?: string | null };

const OPENER: Record<string, string> = {
  'just_listed.editorial': 'Just listed',
  'just_listed.rate': 'Rate this house 1 to 10',
  'open_house.editorial': 'Open house',
  'price_drop.editorial': 'New price',
  'price_drop.rate': 'Worth it now? Rate it 1 to 10',
};

const tag = (s: string) => s.replace(/[^A-Za-z0-9]/g, '');

export const videoCaption = (listing: Listing, beat: Beat, moment: string, disclosure: string | null): string => {
  const a = (listing.address ?? {}) as Address;
  const where = [a.street, [a.city, a.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
  const facts = [
    listing.beds ? `${listing.beds} beds` : '',
    listing.baths ? `${listing.baths} baths` : '',
    listing.sqft ? `${listing.sqft.toLocaleString('en-US')} sqft` : '',
    listing.priceCents ? `$${Math.round(listing.priceCents / 100).toLocaleString('en-US')}` : '',
  ].filter(Boolean).join(' · ');
  const city = tag(a.city ?? '');
  const tags = [city && `#${city}RealEstate`, city && `#${city}Homes`, '#HomeTour', '#RealEstate'].filter(Boolean).join(' ');
  const body = [`${OPENER[beat.key] ?? 'Home tour'}: ${where}`, moment, facts, '', CTA_LINES[beat.cta ?? 'tour'].line, tags].filter((l, i) => l || i === 3).join('\n');
  return withDisclosure(body, disclosure);
};
