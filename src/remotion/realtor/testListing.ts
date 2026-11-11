import type { ListingVideoProps } from './types';

/** 2720 Carolyn Dr SE, Smyrna GA (zpid 14312548): 20 Zillow photos, 6 beats + end picked by hand. */
const dir = 'realtor-test/2720-carolyn';
const p = (n: number) => `${dir}/p${String(n).padStart(2, '0')}.jpg`;

export const CAROLYN_TEST: ListingVideoProps = {
  facts: {
    city: 'Smyrna',
    state: 'GA',
    priceLabel: '$399,000',
    beds: 3,
    baths: 2,
    sqft: 1350,
    hookTop: 'JUST LISTED',
    hookBottom: 'A mile from The Battery',
    locationLine: '1 MILE TO THE BATTERY',
    ctaKeyword: 'TOUR',
  },
  beats: [
    { photo: p(1), photo2: p(0), room: 'porch', kicker: 'JUST LISTED', title: 'Smyrna ranch' },
    { photo: p(2), photo2: p(3), room: 'living', kicker: 'OPEN', title: 'Floor plan', note: 'so much light' },
    { photo: p(5), photo2: p(4), room: 'kitchen', kicker: 'UPDATED', title: 'Kitchen', note: 'new everything' },
    { photo: p(9), photo2: p(8), room: 'feature', kicker: 'EXPOSED', title: 'Brick room', note: 'office or TV room' },
    { photo: p(12), photo2: p(11), room: 'bedroom', kicker: 'PRIMARY', title: 'Suite', note: 'own ensuite!' },
    { photo: p(16), photo2: p(15), room: 'yard', kicker: 'FLAT WALKOUT', title: 'Backyard', note: 'rare flat yard' },
  ],
  endPhoto: p(18),
  reel: [
    { photo: p(1), label: 'front porch' },
    { photo: p(2), label: 'living room' },
    { photo: p(3), label: 'open floor plan' },
    { photo: p(5), label: 'new kitchen' },
    { photo: p(4), label: 'stainless appliances' },
    { photo: p(9), label: 'brick wall bonus room' },
    { photo: p(12), label: 'primary suite' },
    { photo: p(11), label: 'ensuite bath' },
    { photo: p(16), label: 'flat backyard' },
    { photo: p(15), label: 'room for a pool?' },
  ],
};
