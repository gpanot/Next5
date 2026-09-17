// Shared by server and client: what is happening with a property, and how Zillow's status maps to it.
// Plan: docs/business-studios/14-property-create-plan.md.

export const OCCASIONS = ['coming_soon', 'just_listed', 'for_sale', 'open_house', 'under_contract', 'just_sold'] as const;
export type Occasion = (typeof OCCASIONS)[number];

export const OCCASION_LABELS: Record<Occasion, string> = {
  coming_soon: 'Coming soon',
  just_listed: 'Just listed',
  for_sale: 'For sale',
  open_house: 'Open house',
  under_contract: 'Under contract',
  just_sold: 'Just sold',
};

export const isOccasion = (value: unknown): value is Occasion => OCCASIONS.includes(value as Occasion);

export const occasionLabel = (value: string | null | undefined): string | null => (isOccasion(value) ? OCCASION_LABELS[value] : null);

/**
 * Only what Zillow actually says. Off market, or no status at all, returns null so she picks —
 * we never guess what is happening with a home.
 */
export const occasionForStatus = (status: string | null | undefined): Occasion | null => {
  switch (status) {
    case 'coming_soon': return 'coming_soon';
    case 'just_listed': return 'just_listed';
    case 'for_sale': return 'for_sale';
    case 'open_house': return 'open_house';
    case 'pending': return 'under_contract';
    case 'sold': return 'just_sold';
    default: return null;
  }
};
