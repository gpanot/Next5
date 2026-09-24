/**
 * Vertical packs for Campaign Studio v1.
 * Each pack supplies the default research keywords for a business archetype.
 * The profile extractor classifies the client into one of these verticals.
 *
 * M3 research uses researchKeywords as the starting keyword list, then the profile's own
 * extracted keywords are appended (deduplicated).
 */
import type { VerticalPack } from './types';

const PACKS: Record<string, VerticalPack> = {
  real_estate: {
    vertical: 'real_estate',
    researchKeywords: [
      'real estate tips',
      'home buying advice',
      'selling your house',
      'real estate agent',
      'housing market',
      'property investment',
      'first time home buyer',
    ],
    defaultPerspectiveHints: {
      'what-we-actually-do': 'business',
      'meet-the-team': 'business',
      'day-in-the-life': 'audience',
      'n-red-flags': 'audience',
    },
  },

  ecommerce: {
    vertical: 'ecommerce',
    researchKeywords: [
      'product review',
      'unboxing',
      'tiktok shop',
      'online shopping haul',
      'best products',
      'shop with me',
      'product demo',
    ],
    defaultPerspectiveHints: {
      'what-we-actually-do': 'business',
      'before-after': 'audience',
      'warehouse-inventory-tour': 'business',
      'price-spec-reveal': 'business',
    },
  },

  saas: {
    vertical: 'saas',
    researchKeywords: [
      'software review',
      'productivity tools',
      'how to automate',
      'business software',
      'tool tutorial',
      'saas product',
      'workflow hack',
    ],
    defaultPerspectiveHints: {
      'what-we-actually-do': 'business',
      'n-tips-from-a-pro': 'business',
      'tired-of-pain': 'audience',
      'before-after': 'audience',
    },
  },

  restaurant: {
    vertical: 'restaurant',
    researchKeywords: [
      'restaurant vlog',
      'what I ate',
      'food tour',
      'best food',
      'restaurant recommendation',
      'cooking behind the scenes',
      'kitchen day',
    ],
    defaultPerspectiveHints: {
      'day-in-the-life': 'business',
      'meet-the-team': 'business',
      'business-journey': 'business',
      'n-tips-from-a-pro': 'business',
    },
  },

  home_services: {
    vertical: 'home_services',
    researchKeywords: [
      'home improvement tips',
      'before and after renovation',
      'DIY home fix',
      'contractor advice',
      'home service',
      'home repair',
      'renovation reveal',
    ],
    defaultPerspectiveHints: {
      'before-after': 'business',
      'what-we-actually-do': 'business',
      'n-red-flags': 'audience',
      'how-to-vet-a-pro': 'audience',
    },
  },

  automotive: {
    vertical: 'automotive',
    researchKeywords: [
      'mechanic tips',
      'auto repair shop day in the life',
      'car maintenance tips',
      'mechanic red flags',
      'auto shop behind the scenes',
      'car repair explained',
      'oil change tips',
    ],
    defaultPerspectiveHints: {
      'day-in-the-life': 'business',
      'what-we-actually-do': 'business',
      'n-red-flags': 'audience',
      'how-to-vet-a-pro': 'audience',
    },
  },

  health_wellness: {
    vertical: 'health_wellness',
    researchKeywords: [
      'chiropractor tips',
      'back pain relief',
      'posture tips',
      'physical therapy exercises',
      'wellness clinic day in the life',
      'patient results',
      'health myths debunked',
    ],
    defaultPerspectiveHints: {
      'day-in-the-life': 'business',
      'what-we-actually-do': 'business',
      'before-after': 'audience',
      'n-tips-from-a-pro': 'business',
    },
  },

  beauty_spa: {
    vertical: 'beauty_spa',
    researchKeywords: [
      'spa day vlog',
      'self care routine',
      'esthetician tips',
      'facial before and after',
      'massage therapist day in the life',
      'skincare tips from a pro',
      'spa behind the scenes',
    ],
    defaultPerspectiveHints: {
      'day-in-the-life': 'business',
      'before-after': 'audience',
      'what-we-actually-do': 'business',
      'n-tips-from-a-pro': 'business',
    },
  },
};

/** Generic fallback for verticals not in the list above. */
const GENERIC_PACK: VerticalPack = {
  vertical: 'generic',
  researchKeywords: [
    'business tips',
    'small business',
    'entrepreneur advice',
    'how we built',
    'behind the scenes',
  ],
  defaultPerspectiveHints: {},
};

/** Returns the vertical pack for the given vertical slug, or the generic fallback. */
export function getVerticalPack(vertical: string): VerticalPack {
  return PACKS[vertical] ?? GENERIC_PACK;
}

/** All registered verticals. Used by the classification layer to validate LLM output. */
export const KNOWN_VERTICALS = Object.keys(PACKS);
