/**
 * The workspace's target client: the age range and gender of the people it sells to most today, picked by the owner on
 * the first onboarding screen (a hard stop: the first run makes no Brand Cast face and no slideshow before it), and
 * editable on the Brand page. The Brand Cast is cast from it. Option keys are stable: never store the display label.
 */

export const TARGET_AGES = ['20_30', '30_40', '40_50', '50_plus'] as const;
export type TargetAge = (typeof TARGET_AGES)[number];

export const TARGET_GENDERS = ['female', 'male', 'both'] as const;
export type TargetGender = (typeof TARGET_GENDERS)[number];

export const TARGET_AGE_LABELS: Record<TargetAge, string> = { '20_30': '20-30', '30_40': '30-40', '40_50': '40-50', '50_plus': '50+' };
export const TARGET_GENDER_LABELS: Record<TargetGender, string> = { female: 'Women', male: 'Men', both: 'Both' };

/** Ages the Brand Cast is written in for each pick (the youngest face is 22, never a teen). */
export const TARGET_CAST_AGES: Record<TargetAge, { min: number; max: number }> = {
  '20_30': { min: 22, max: 30 },
  '30_40': { min: 30, max: 40 },
  '40_50': { min: 40, max: 50 },
  '50_plus': { min: 50, max: 60 },
};

/** What the Visual Bible's "Age range" says once the owner picked. */
export const TARGET_BIBLE_AGES: Record<TargetAge, string> = { '20_30': '20-30', '30_40': '30-40', '40_50': '40-50', '50_plus': '50-65' };

export const isTargetAge = (v: unknown): v is TargetAge => (TARGET_AGES as readonly unknown[]).includes(v);
export const isTargetGender = (v: unknown): v is TargetGender => (TARGET_GENDERS as readonly unknown[]).includes(v);

/** The pick closest to an age range read from the site ("25-45", "30+"), by its middle. Null when it has no age. */
export const targetAgeOf = (range: string | null | undefined): TargetAge | null => {
  const ages = (range?.match(/\d{2}/g) ?? []).map(Number).filter((n) => n >= 13 && n <= 99);
  if (ages.length === 0) return null;
  const mid = ages.length === 1 ? ages[0]! + 5 : (Math.min(...ages) + Math.max(...ages)) / 2;
  if (mid < 30) return '20_30';
  if (mid < 40) return '30_40';
  if (mid < 50) return '40_50';
  return '50_plus';
};

/**
 * GET/PUT /api/slideshow/workspaces/[workspaceId]/target. `detectedRange`: the age range read from the website ("25-45"),
 * null until the Visual Bible is made or when the site shows no people. `confirmedAt` null: not picked yet.
 */
export type TargetClientDto = {
  age: TargetAge | null;
  gender: TargetGender | null;
  confirmedAt: string | null;
  detectedRange: string | null;
  /** True while the onboarding flow is open: it asks itself, so the workspace pop-up waits. */
  inOnboarding: boolean;
};
