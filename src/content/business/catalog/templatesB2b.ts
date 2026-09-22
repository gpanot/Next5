/**
 * Extra Brand styles for B2B influencers (business, real estate, legal, events, seasonal).
 * Kept out of BRAND_TEMPLATES so the marketing sets gallery stays at the original six.
 * Covers are the demo influencer's first sample photo (scripts/gen-influencer-samples.ts).
 */

import type { SetTemplateSeed } from './types';

const COVER = '/images/business/us/influencer/brand';

type Seed = Omit<SetTemplateSeed, 'product' | 'coverImage' | 'sortOrder'>;

const SEEDS: readonly Seed[] = [
  {
    id: 'executive-suite', name: 'Executive Suite', description: 'A corner office with a city view.',
    config: {
      lighting: 'Soft overcast daylight from floor-to-ceiling windows, calm and premium.',
      defaults: { wardrobe: 'business_formal', poseEnergy: 'confident_expert' },
      locations: [{ id: 'corner-office', label: 'Corner office', direction: 'Corner executive office with a walnut desk, leather chair and a softly blurred city skyline.' }],
    },
  },
  {
    id: 'open-house', name: 'Open House', description: 'The front porch of a home for sale.',
    config: {
      lighting: 'Warm late-afternoon sun, soft shadows, welcoming.',
      defaults: { wardrobe: 'smart_casual', poseEnergy: 'warm_approachable' },
      locations: [{ id: 'front-porch', label: 'Front porch', direction: 'Front porch of a white suburban craftsman home with a navy door, potted boxwoods and a clean lawn, no signs.' }],
    },
  },
  {
    id: 'law-office', name: 'Law Office', description: 'Dark wood and shelves of law books.',
    config: {
      lighting: 'Soft window light with a warm desk lamp, serious and trustworthy.',
      defaults: { wardrobe: 'business_formal', poseEnergy: 'confident_expert' },
      locations: [{ id: 'library-desk', label: 'Library desk', direction: 'Traditional law office with floor-to-ceiling dark wood shelves of leather-bound books and a green banker lamp, no readable spines.' }],
    },
  },
  {
    id: 'holiday-season', name: 'Holiday Season', description: 'Warm lights and a cozy festive room.',
    config: {
      lighting: 'Warm tungsten room light with soft bokeh from string lights.',
      defaults: { wardrobe: 'smart_casual', poseEnergy: 'warm_approachable' },
      locations: [{ id: 'festive-living-room', label: 'Festive living room', direction: 'Cozy living room with a decorated pine tree, warm string lights and a knit throw, no text or logos.' }],
    },
  },
  {
    id: 'boardroom', name: 'Boardroom', description: 'A long table, ready for a big meeting.',
    config: {
      lighting: 'Even soft daylight with gentle overhead fill, crisp corporate feel.',
      defaults: { wardrobe: 'business_formal', poseEnergy: 'confident_expert' },
      locations: [{ id: 'glass-boardroom', label: 'Glass boardroom', direction: 'Modern boardroom with a long oak table, black mesh chairs and a glass wall, no screens with text.' }],
    },
  },
  {
    id: 'conference-stage', name: 'Conference Stage', description: 'Speaking on stage at an event.',
    config: {
      lighting: 'Warm stage spotlight from the front, dark audience area behind.',
      defaults: { wardrobe: 'business_formal', poseEnergy: 'dynamic_candid' },
      locations: [{ id: 'keynote-stage', label: 'Keynote stage', direction: 'Conference stage with a dark backdrop and soft blue ambient light, blank screen, no text.' }],
    },
  },
  {
    id: 'podcast-studio', name: 'Podcast Studio', description: 'A mic, headphones and soft panels.',
    config: {
      lighting: 'Warm practical light with a soft key from the side, moody and intimate.',
      defaults: { wardrobe: 'smart_casual', poseEnergy: 'warm_approachable' },
      locations: [{ id: 'podcast-desk', label: 'Podcast desk', direction: 'Small podcast studio with a black boom-arm microphone, grey acoustic panels and a warm lamp, no logos.' }],
    },
  },
  {
    id: 'coworking-space', name: 'Coworking', description: 'A busy, bright shared workspace.',
    config: {
      lighting: 'Bright diffused daylight from skylights, fresh and energetic.',
      defaults: { wardrobe: 'smart_casual', poseEnergy: 'dynamic_candid' },
      locations: [{ id: 'shared-table', label: 'Shared table', direction: 'Industrial coworking space with exposed brick, long shared tables, laptops and hanging plants, people far and blurred.' }],
    },
  },
  {
    id: 'rooftop-terrace', name: 'Rooftop Terrace', description: 'A city rooftop at golden hour.',
    config: {
      lighting: 'Golden-hour backlight with warm rim light on the hair.',
      defaults: { wardrobe: 'smart_casual', poseEnergy: 'warm_approachable' },
      locations: [{ id: 'city-rooftop', label: 'City rooftop', direction: 'Rooftop terrace with a glass railing, teak lounge furniture and a soft city skyline at sunset.' }],
    },
  },
  {
    id: 'on-the-road', name: 'On the Road', description: 'In the car, between two showings.',
    config: {
      lighting: 'Soft daylight through the windshield, natural and candid.',
      defaults: { wardrobe: 'smart_casual', poseEnergy: 'dynamic_candid' },
      locations: [{ id: 'driver-seat', label: 'Driver seat', direction: 'Driver seat of a parked modern car with a tan leather interior, tree-lined street blurred through the window, no badges.' }],
    },
  },
  {
    id: 'hotel-lobby', name: 'Hotel Lobby', description: 'A grand lobby on a business trip.',
    config: {
      lighting: 'Warm ambient lobby light with soft brass reflections.',
      defaults: { wardrobe: 'business_formal', poseEnergy: 'confident_expert' },
      locations: [{ id: 'marble-lobby', label: 'Marble lobby', direction: 'Luxury hotel lobby with cream marble floors, brass details and a velvet sofa, no readable signs.' }],
    },
  },
  {
    id: 'networking-event', name: 'Networking Event', description: 'An evening mixer with a drink in hand.',
    config: {
      lighting: 'Warm evening ambient light with soft bokeh from pendant bulbs.',
      defaults: { wardrobe: 'business_formal', poseEnergy: 'dynamic_candid' },
      locations: [{ id: 'evening-mixer', label: 'Evening mixer', direction: 'Upscale evening networking event in a loft with pendant lights, guests far and blurred, no logos.' }],
    },
  },
];

export const B2B_TEMPLATES: readonly SetTemplateSeed[] = SEEDS.map((seed, index) => ({
  ...seed,
  product: 'brand',
  coverImage: `${COVER}/${seed.id}-1.png`,
  sortOrder: 7 + index,
}));
