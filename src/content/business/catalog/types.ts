/** Shared catalog types for set templates and themes (seeded into the DB and used by marketing pages). */

import type { ProductLineId } from '../../../config/plans';

export type TemplateLocation = { id: string; label: string; direction: string };

export type SetTemplateConfig = {
  locations: readonly TemplateLocation[];
  lighting: string;
  defaults: { wardrobe?: string; poseEnergy?: string };
  shotOverrides?: Readonly<Record<string, string>>;
};

export type SetTemplateSeed = {
  id: string;
  product: ProductLineId;
  name: string;
  description: string;
  coverImage: string;
  sortOrder: number;
  config: SetTemplateConfig;
};

export type ThemeScene = { id: string; label: string; direction: string };

export type ThemeSeed = {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  featuredMonth: string | null;
  sortOrder: number;
  scenes: readonly ThemeScene[];
};

export type WardrobeId = 'business_formal' | 'smart_casual' | 'brand_color_accent';
export type PoseEnergyId = 'warm_approachable' | 'confident_expert' | 'dynamic_candid';

export const WARDROBES: readonly { id: WardrobeId; label: string; direction: string }[] = [
  { id: 'business_formal', label: 'Business formal', direction: 'Tailored business formal outfit — blazer, crisp blouse or shirt, refined accessories.' },
  { id: 'smart_casual', label: 'Smart casual', direction: 'Polished smart casual outfit — soft knit or blouse, tailored trousers, minimal jewelry.' },
  { id: 'brand_color_accent', label: 'Brand colour accent', direction: 'Elegant professional outfit with one clear accent piece in the brand colour.' },
];

export const POSE_ENERGIES: readonly { id: PoseEnergyId; label: string; direction: string }[] = [
  { id: 'warm_approachable', label: 'Warm & approachable', direction: 'Warm genuine smile, open relaxed body language, approachable.' },
  { id: 'confident_expert', label: 'Confident expert', direction: 'Confident composed expression, upright posture, calm authority.' },
  { id: 'dynamic_candid', label: 'Dynamic & candid', direction: 'Natural candid movement, mid-gesture or mid-laugh, energetic.' },
];

export const INDUSTRIES: readonly { id: string; label: string }[] = [
  { id: 'realtor', label: 'Real estate' },
  { id: 'coach', label: 'Coaching & consulting' },
  { id: 'beauty', label: 'Beauty & wellness' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'finance', label: 'Finance & insurance' },
  { id: 'other', label: 'Other' },
];

export const SHOP_CATEGORIES: readonly { id: string; label: string }[] = [
  { id: 'fashion', label: 'Fashion' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'mixed', label: 'Mixed' },
];
