/**
 * Set templates (Brand "sets", Shop "looks"). Spec: 01-product-spec.md §2.3 and §3.3.
 * Cover paths reference docs/business-studios/04-image-prompts.md (B3–B8, C9–C14).
 */

import type { SetTemplateSeed } from './types';

const IMG = '/images/business';

export const BRAND_TEMPLATES: readonly SetTemplateSeed[] = [
  {
    id: 'modern-office',
    product: 'brand',
    name: 'Modern Office',
    description: 'Glass, light wood and soft daylight with a city view.',
    coverImage: `${IMG}/brand/sets/modern-office.jpg`,
    sortOrder: 1,
    config: {
      lighting: 'Soft natural daylight from large windows, gentle fill, clean and bright.',
      defaults: { wardrobe: 'business_formal', poseEnergy: 'confident_expert' },
      locations: [
        { id: 'glass-meeting-room', label: 'Glass meeting room', direction: 'Bright modern office beside a glass meeting-room wall, light oak desks, city skyline softly blurred through windows.' },
        { id: 'open-workspace', label: 'Open workspace', direction: 'Airy open-plan office with light wood tables, green plants and white walls, softly blurred colleagues-free background.' },
        { id: 'reception-lounge', label: 'Reception lounge', direction: 'Minimal office reception lounge with a sculptural sofa, warm wood slats and soft indirect lighting.' },
      ],
    },
  },
  {
    id: 'listing-interior',
    product: 'brand',
    name: 'Luxury Listing',
    description: 'Bright staged homes with architectural lines.',
    coverImage: `${IMG}/brand/sets/listing-interior.jpg`,
    sortOrder: 2,
    config: {
      lighting: 'Bright afternoon daylight through tall windows, airy and luxurious.',
      defaults: { wardrobe: 'smart_casual', poseEnergy: 'warm_approachable' },
      locations: [
        { id: 'living-room', label: 'Living room', direction: 'Spacious staged living room with a cream sofa, tall windows, linen curtains and a sculptural lamp.' },
        { id: 'kitchen-island', label: 'Kitchen island', direction: 'Bright designer kitchen with a white marble island, pendant lights and light oak cabinetry.' },
        { id: 'balcony-view', label: 'Balcony view', direction: 'Modern apartment balcony with glass railing and a wide open city view, soft sky.' },
        { id: 'entrance-hall', label: 'Entrance hall', direction: 'Elegant entrance hall of a modern home with a wide wooden door and a potted olive tree.' },
      ],
    },
  },
  {
    id: 'neighborhood-cafe',
    product: 'brand',
    name: 'Neighborhood Café',
    description: 'Warm café, laptop and coffee by the window.',
    coverImage: `${IMG}/brand/sets/neighborhood-cafe.jpg`,
    sortOrder: 3,
    config: {
      lighting: 'Warm morning window light, soft shadows, cosy atmosphere.',
      defaults: { wardrobe: 'smart_casual', poseEnergy: 'warm_approachable' },
      locations: [
        { id: 'window-table', label: 'Window table', direction: 'Small café window table with a laptop, notebook and ceramic coffee cup, warm wood and plants blurred behind.' },
        { id: 'coffee-bar', label: 'Coffee bar', direction: 'Standing at a light wood café counter with pastries and plants softly blurred, no readable menus.' },
        { id: 'terrace', label: 'Terrace', direction: 'Leafy café terrace with rattan chairs and dappled sunlight.' },
      ],
    },
  },
  {
    id: 'studio-backdrop',
    product: 'brand',
    name: 'Studio Backdrop',
    description: 'Seamless warm-grey backdrop, the classic headshot.',
    coverImage: `${IMG}/brand/sets/studio-backdrop.jpg`,
    sortOrder: 4,
    config: {
      lighting: 'Soft large key light from the left with gentle fill, crisp and timeless studio lighting.',
      defaults: { wardrobe: 'business_formal', poseEnergy: 'confident_expert' },
      locations: [
        { id: 'warm-grey', label: 'Warm grey', direction: 'Seamless warm grey studio backdrop.' },
        { id: 'soft-cream', label: 'Soft cream', direction: 'Seamless soft cream studio backdrop with a subtle vignette.' },
        { id: 'deep-charcoal', label: 'Deep charcoal', direction: 'Seamless deep charcoal studio backdrop with gentle rim light.' },
      ],
    },
  },
  {
    id: 'urban-outdoor',
    product: 'brand',
    name: 'Urban Outdoor',
    description: 'Modern street, glass façades, golden hour.',
    coverImage: `${IMG}/brand/sets/urban-outdoor.jpg`,
    sortOrder: 5,
    config: {
      lighting: 'Golden-hour side light, warm tones, softly blurred background.',
      defaults: { wardrobe: 'smart_casual', poseEnergy: 'dynamic_candid' },
      locations: [
        { id: 'glass-facades', label: 'Glass façades', direction: 'Clean modern city sidewalk with glass and concrete façades, no readable signs.' },
        { id: 'plaza-steps', label: 'Plaza steps', direction: 'Wide stone steps of a modern plaza with minimal architecture.' },
        { id: 'tree-lined-street', label: 'Tree-lined street', direction: 'Quiet tree-lined business street with soft dappled light.' },
      ],
    },
  },
  {
    id: 'home-office',
    product: 'brand',
    name: 'Home Office',
    description: 'Bookshelves, plants and calm natural light.',
    coverImage: `${IMG}/brand/sets/home-office.jpg`,
    sortOrder: 6,
    config: {
      lighting: 'Calm soft window light, warm and inviting.',
      defaults: { wardrobe: 'smart_casual', poseEnergy: 'warm_approachable' },
      locations: [
        { id: 'desk-bookshelves', label: 'Desk & bookshelves', direction: 'Tidy home office desk with bookshelves and green plants behind.' },
        { id: 'reading-corner', label: 'Reading corner', direction: 'Cosy reading corner with a linen armchair, floor lamp and plants.' },
        { id: 'window-desk', label: 'Window desk', direction: 'Minimal desk by a large window with a laptop and a ceramic mug.' },
      ],
    },
  },
];

export const SHOP_TEMPLATES: readonly SetTemplateSeed[] = [
  {
    id: 'clean-white',
    product: 'shop',
    name: 'Clean Studio',
    description: 'Seamless light background — the marketplace listing standard.',
    coverImage: `${IMG}/shop/looks/clean-white.jpg`,
    sortOrder: 1,
    config: {
      lighting: 'Even soft studio light, no harsh shadows, true-to-life colours.',
      defaults: {},
      locations: [{ id: 'seamless-light', label: 'Seamless light grey', direction: 'Seamless light-grey to white studio background, clean floor.' }],
    },
  },
  {
    id: 'beige-wall',
    product: 'shop',
    name: 'Soft Beige Wall',
    description: 'Warm plaster wall with window shadows — the boutique Instagram look.',
    coverImage: `${IMG}/shop/looks/beige-wall.jpg`,
    sortOrder: 2,
    config: {
      lighting: 'Soft window light with gentle diagonal shadows across the wall.',
      defaults: {},
      locations: [{ id: 'plaster-wall', label: 'Plaster wall', direction: 'Warm beige textured plaster wall with a light wooden floor.' }],
    },
  },
  {
    id: 'cafe-lifestyle',
    product: 'shop',
    name: 'Café Lifestyle',
    description: 'Bright café, natural light, relaxed and candid.',
    coverImage: `${IMG}/shop/looks/cafe-lifestyle.jpg`,
    sortOrder: 3,
    config: {
      lighting: 'Bright natural daylight, airy and relaxed.',
      defaults: {},
      locations: [{ id: 'sunny-cafe', label: 'Sunny café', direction: 'Bright sunny café interior with light wood and plants, no readable signs or logos.' }],
    },
  },
  {
    id: 'street-urban',
    product: 'shop',
    name: 'Street',
    description: 'Clean modern street, concrete and glass, daylight.',
    coverImage: `${IMG}/shop/looks/street-urban.jpg`,
    sortOrder: 4,
    config: {
      lighting: 'Natural daylight, slightly warm, softly blurred background.',
      defaults: {},
      locations: [{ id: 'modern-street', label: 'Modern street', direction: 'Clean modern street with concrete and glass buildings, no readable signs.' }],
    },
  },
  {
    id: 'boutique-rack',
    product: 'shop',
    name: 'Boutique',
    description: 'Minimal boutique interior with a clothing rail behind.',
    coverImage: `${IMG}/shop/looks/boutique-rack.jpg`,
    sortOrder: 5,
    config: {
      lighting: 'Warm spot lighting mixed with soft daylight, elegant.',
      defaults: {},
      locations: [{ id: 'minimal-boutique', label: 'Minimal boutique', direction: 'Minimal boutique interior with a neutral clothing rail softly blurred behind.' }],
    },
  },
  {
    id: 'resort',
    product: 'shop',
    name: 'Resort',
    description: 'Pool terrace and beach walkway, bright summer sun.',
    coverImage: `${IMG}/shop/looks/resort.jpg`,
    sortOrder: 6,
    config: {
      lighting: 'Bright summer sunlight with palm shadows, fresh and vivid.',
      defaults: {},
      locations: [{ id: 'pool-terrace', label: 'Pool terrace', direction: 'Pale stone pool terrace with palm shadows and a clear blue pool edge.' }],
    },
  },
];

export const ALL_TEMPLATES: readonly SetTemplateSeed[] = [...BRAND_TEMPLATES, ...SHOP_TEMPLATES];
