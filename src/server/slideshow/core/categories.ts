// server-only — never import from a 'use client' file.
// Industry categories for library assets and engine audiences.
//
// Every described asset carries 1–3 of these (asset_descriptors.categories, the descriptor JSON,
// and blitz_assets.tags). Every brief maps its audience to them, so a Pain shot for electricians
// comes from electrician footage, not generic stock. 'general' = fits any industry
// (reaction memes, a person talking to camera, everyday lifestyle).

export type AssetCategory = {
  slug: string;
  /** Tag written on blitz_assets.tags, shown in the library. */
  label: string;
  /** What belongs here — given to the classifier. */
  hint: string;
};

export const ASSET_CATEGORIES: readonly AssetCategory[] = [
  { slug: 'general', label: 'General', hint: 'fits any industry: reaction memes, person talking to camera, everyday lifestyle, emotions' },
  { slug: 'real_estate', label: 'Real estate', hint: 'houses, home tours, interiors, keys, open houses, moving, realtors' },
  { slug: 'home_services', label: 'Home services', hint: 'handyman, repairs at a client home, home maintenance visits' },
  { slug: 'electricians', label: 'Electricians', hint: 'wiring, panels, outlets, electrician at work, tools, ladders' },
  { slug: 'plumbing', label: 'Plumbing', hint: 'pipes, sinks, leaks, water heaters, plumber at work' },
  { slug: 'hvac', label: 'HVAC', hint: 'air conditioning, heating, furnaces, vents, technicians' },
  { slug: 'construction_trades', label: 'Construction & trades', hint: 'building sites, carpentry, roofing, painting, tradespeople, power tools' },
  { slug: 'auto_repair', label: 'Auto repair', hint: 'car garage, mechanics, engines, tires, workshop, car service' },
  { slug: 'cleaning', label: 'Cleaning', hint: 'house cleaning, janitorial, laundry, tidy spaces' },
  { slug: 'landscaping', label: 'Landscaping', hint: 'gardens, lawns, yard work, outdoor maintenance' },
  { slug: 'beauty_salon', label: 'Beauty & salon', hint: 'hair, nails, makeup, barbers, skincare treatments in a salon' },
  { slug: 'spa_wellness', label: 'Spa & wellness', hint: 'massage, spa, meditation, yoga, relaxation' },
  { slug: 'fitness', label: 'Fitness', hint: 'gym, workouts, trainers, sports, running' },
  { slug: 'healthcare', label: 'Healthcare', hint: 'clinics, doctors, nurses, physio, chiropractic, patients' },
  { slug: 'dental', label: 'Dental', hint: 'dentists, teeth, dental clinic' },
  { slug: 'restaurant_food', label: 'Restaurant & food', hint: 'cooking, restaurants, cafes, food, drinks, kitchens in service' },
  { slug: 'retail_shopping', label: 'Retail & shopping', hint: 'stores, shopping, unboxing, product reviews, TikTok Shop' },
  { slug: 'fashion', label: 'Fashion', hint: 'outfits, clothing, accessories, style' },
  { slug: 'pets', label: 'Pets', hint: 'dogs, cats, grooming, vets' },
  { slug: 'office_business', label: 'Office & business', hint: 'laptops, desks, meetings, phones, emails, software, admin work, small business owners' },
  { slug: 'finance_legal', label: 'Finance & legal', hint: 'money, bills, accounting, insurance, lawyers, paperwork' },
  { slug: 'education', label: 'Education & coaching', hint: 'teaching, courses, studying, coaching' },
  { slug: 'travel_hospitality', label: 'Travel & hospitality', hint: 'hotels, travel, vacations, events, weddings' },
  { slug: 'family', label: 'Family & kids', hint: 'parents, children, family life at home' },
];

export const CATEGORY_SLUGS = ASSET_CATEGORIES.map((c) => c.slug);

const BY_SLUG = new Map(ASSET_CATEGORIES.map((c) => [c.slug, c]));

export const categoryLabel = (slug: string): string => BY_SLUG.get(slug)?.label ?? slug;

/** Keeps known slugs only, deduped, max `max`. */
export const cleanCategories = (raw: unknown, max = 3): string[] =>
  Array.isArray(raw)
    ? [...new Set(raw.filter((s): s is string => typeof s === 'string' && BY_SLUG.has(s)))].slice(0, max)
    : [];

/** The list as the classifier prompt shows it. */
export const categoryMenu = (): string =>
  ASSET_CATEGORIES.map((c) => `- ${c.slug}: ${c.hint}`).join('\n');
