/**
 * Shop Studio product categories, shots and shot packs.
 * Spec: docs/business-studios/01-product-spec.md §3.3.
 */

export type ProductCategory =
  | 'top'
  | 'dress'
  | 'skirt'
  | 'pants'
  | 'set'
  | 'outerwear'
  | 'swim'
  | 'bag'
  | 'shoes'
  | 'jewelry'
  | 'accessory';

export const PRODUCT_CATEGORIES: readonly { id: ProductCategory; label: string }[] = [
  { id: 'top', label: 'Top' },
  { id: 'dress', label: 'Dress' },
  { id: 'skirt', label: 'Skirt' },
  { id: 'pants', label: 'Pants' },
  { id: 'set', label: 'Set' },
  { id: 'outerwear', label: 'Outerwear' },
  { id: 'swim', label: 'Swimwear' },
  { id: 'bag', label: 'Bag' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'jewelry', label: 'Jewelry' },
  { id: 'accessory', label: 'Accessory' },
];

export const ACCESSORY_CATEGORIES: readonly ProductCategory[] = ['bag', 'shoes', 'jewelry', 'accessory'];

export type ProductFit = 'fitted' | 'regular' | 'oversized';

export type ShotId =
  | 'full_body_front'
  | 'half_body'
  | 'detail_closeup'
  | 'walking_motion'
  | 'back_or_side'
  | 'worn_half_body'
  | 'lifestyle_in_hand_or_on_foot'
  | 'seated_pose'
  | 'side_profile'
  | 'lifestyle_candid'
  | 'full_body_styled';

export type Shot = { id: ShotId; label: string; direction: string; requiresBackPhoto: boolean };

export const SHOTS: Record<ShotId, Shot> = {
  full_body_front: {
    id: 'full_body_front',
    label: 'Full body',
    direction:
      'Full body, standing and facing the camera, the whole garment visible from head to toe, relaxed natural pose.',
    requiresBackPhoto: false,
  },
  half_body: {
    id: 'half_body',
    label: 'Half body',
    direction: 'Waist-up framing, slight three-quarter turn, the upper part of the garment clearly visible.',
    requiresBackPhoto: false,
  },
  detail_closeup: {
    id: 'detail_closeup',
    label: 'Detail',
    direction:
      'Close-up on the garment details — fabric texture, buttons, print or neckline — with part of the person in frame.',
    requiresBackPhoto: false,
  },
  walking_motion: {
    id: 'walking_motion',
    label: 'Walking',
    direction: 'Full body mid-stride walking toward the camera, natural movement in the fabric.',
    requiresBackPhoto: false,
  },
  back_or_side: {
    id: 'back_or_side',
    label: 'Back',
    direction: 'Full body seen from behind, looking back over the shoulder, the back of the garment clearly visible.',
    requiresBackPhoto: true,
  },
  worn_half_body: {
    id: 'worn_half_body',
    label: 'Worn',
    direction: 'Waist-up framing with the accessory worn or carried naturally and clearly visible.',
    requiresBackPhoto: false,
  },
  lifestyle_in_hand_or_on_foot: {
    id: 'lifestyle_in_hand_or_on_foot',
    label: 'Lifestyle',
    direction:
      'Candid lifestyle moment focused on the accessory in hand or on foot, the item sharp and prominent.',
    requiresBackPhoto: false,
  },
  seated_pose: {
    id: 'seated_pose',
    label: 'Seated',
    direction: 'Seated relaxed on a chair, step or ledge, full outfit visible, showing how the garment sits and folds.',
    requiresBackPhoto: false,
  },
  side_profile: {
    id: 'side_profile',
    label: 'Side',
    direction: 'Full body in side profile, showing the silhouette, fit and length of the item from the side.',
    requiresBackPhoto: false,
  },
  lifestyle_candid: {
    id: 'lifestyle_candid',
    label: 'Lifestyle',
    direction: 'Candid everyday moment in the location (laughing, adjusting hair or holding a coffee), the item clearly visible and sharp.',
    requiresBackPhoto: false,
  },
  full_body_styled: {
    id: 'full_body_styled',
    label: 'Full outfit',
    direction: 'Full body styled outfit, standing and facing the camera, the accessory clearly visible as part of the look.',
    requiresBackPhoto: false,
  },
};

export type PackId = 'listing' | 'full' | 'accessory';

export type Pack = { id: PackId; label: string; description: string; shots: readonly ShotId[] };

export const PACKS: Record<PackId, Pack> = {
  listing: {
    id: 'listing',
    label: 'Listing',
    description: 'Full body, half body and a detail shot.',
    shots: ['full_body_front', 'half_body', 'detail_closeup'],
  },
  full: {
    id: 'full',
    label: 'Full',
    description: 'The listing pack plus walking and back shots.',
    shots: ['full_body_front', 'half_body', 'detail_closeup', 'walking_motion', 'back_or_side'],
  },
  accessory: {
    id: 'accessory',
    label: 'Accessory',
    description: 'Worn, detail and lifestyle shots for bags, shoes and jewelry.',
    shots: ['worn_half_body', 'detail_closeup', 'lifestyle_in_hand_or_on_foot'],
  },
};

export const isPackId = (value: string): value is PackId => value in PACKS;

export const isProductCategory = (value: string): value is ProductCategory =>
  PRODUCT_CATEGORIES.some((category) => category.id === value);

export const isAccessoryCategory = (category: string): boolean =>
  (ACCESSORY_CATEGORIES as readonly string[]).includes(category);

/** Accessories always use the accessory pack, whatever the batch pack is. */
export const packForCategory = (category: string, requested: PackId): PackId =>
  isAccessoryCategory(category) ? 'accessory' : requested === 'accessory' ? 'listing' : requested;

/** Shots for one product, skipping shots that need a photo the product doesn't have. */
export const shotsForProduct = (
  category: string,
  requested: PackId,
  hasBackPhoto: boolean,
): readonly ShotId[] =>
  PACKS[packForCategory(category, requested)].shots.filter(
    (shot) => hasBackPhoto || !SHOTS[shot].requiresBackPhoto,
  );

/** Photos per TikTok Shop listing that sell best. */
export const TIKTOK_PHOTO_SWEET_SPOT = { min: 5, max: 9 } as const;

/** How many new angles "Create more photos" adds per product. */
export const MORE_PHOTOS_STEP = 3;

/** Every angle for a product, in the order photos get made: the first pack, then "Create more photos". */
const SHOT_SEQUENCE: Record<'apparel' | 'accessory', readonly ShotId[]> = {
  apparel: ['full_body_front', 'half_body', 'detail_closeup', 'walking_motion', 'back_or_side', 'seated_pose', 'side_profile', 'lifestyle_candid'],
  accessory: ['worn_half_body', 'detail_closeup', 'lifestyle_in_hand_or_on_foot', 'full_body_styled', 'walking_motion', 'side_profile'],
};

/** The angle used for a 9:16 video cover: the product's main shot (full body, or worn for accessories). */
export const coverShotFor = (category: string): ShotId => SHOT_SEQUENCE[isAccessoryCategory(category) ? 'accessory' : 'apparel'][0]!;

/** The next angles this product doesn't have yet (skipping shots that need a back photo it lacks). */
export const nextShotsForProduct = (
  category: string,
  hasBackPhoto: boolean,
  madeShots: readonly string[],
  limit = MORE_PHOTOS_STEP,
): ShotId[] =>
  SHOT_SEQUENCE[isAccessoryCategory(category) ? 'accessory' : 'apparel']
    .filter((shot) => !madeShots.includes(shot) && (hasBackPhoto || !SHOTS[shot].requiresBackPhoto))
    .slice(0, limit);
