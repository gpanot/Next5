// A brand's Visual Bible: the rules every Shorts photo follows so it looks like this brand, not like stock.
// Read from the brand's own site photos and profile (server/shorts/visualBible.ts), stored on the brand profile,
// editable in the admin. Flat string fields: the small models skip fields nested in objects.

export const VISUAL_BIBLE_FIELDS = [
  { key: 'business_category', label: 'Category', hint: '2-5 words' },
  { key: 'hero_product', label: 'Hero product', hint: 'The one exact product the videos show: brand, model, color' },
  { key: 'primary_subject', label: 'Main subject', hint: 'What most photos center on' },
  { key: 'person_age_range', label: 'Age range', hint: 'e.g. 25-35, or "none" when no people' },
  { key: 'person_look', label: 'People look', hint: 'Build, styling, grooming, energy' },
  { key: 'wardrobe', label: 'Wardrobe', hint: 'What people wear' },
  { key: 'environments', label: 'Places', hint: 'Real-life places, comma separated' },
  { key: 'visual_style', label: 'Photo style', hint: 'Always bright daylight' },
  { key: 'product_visibility', label: 'Product visibility', hint: 'How and how often the product shows' },
  { key: 'shot_vocabulary', label: 'Shot types', hint: 'Shot types for this category, separated by |' },
  { key: 'consistency_rules', label: 'Consistency', hint: 'What stays the same in every shot' },
  { key: 'avoid', label: 'Avoid', hint: 'Off-brand looks' },
  { key: 'design_story', label: 'Design story', hint: 'The brand’s visual identity in plain words' },
] as const;

export type VisualBibleKey = (typeof VISUAL_BIBLE_FIELDS)[number]['key'];

export type VisualBible = Record<VisualBibleKey, string> & {
  /** 'auto': read from the site; 'edited': changed by an admin (a rebuild replaces it). */
  source: 'auto' | 'edited';
  updatedAt: string;
  /** The site photos the bible was read from. */
  images: string[];
};

export const isVisualBibleKey = (k: string): k is VisualBibleKey => VISUAL_BIBLE_FIELDS.some((f) => f.key === k);

/** GET/PUT /api/admin/shorts/workspaces/[id]/bible */
export type VisualBibleDto = { workspaceId: string; brandName: string; bible: VisualBible | null };
