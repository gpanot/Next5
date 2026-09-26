/**
 * Manual brand profile — the "B2B No Website" flow of Blitz Slideshow.
 *
 * For small businesses with a weak website or none: the admin types the profile by hand instead
 * of crawling a URL, and uploads product photos. The result is stored as a normal Campaign Studio
 * run (sourceUrl `manual://…`), so the website slideshow engine builds the deck unchanged.
 *
 * Shared by the form (client) and the API route (server). No server imports here.
 */

export const MANUAL_SOURCE_PREFIX = 'manual://';

export const isManualSource = (sourceUrl: string): boolean => sourceUrl.startsWith(MANUAL_SOURCE_PREFIX);

export const MANUAL_TONES = ['casual', 'authoritative', 'witty', 'inspirational', 'educational'] as const;
export type ManualTone = (typeof MANUAL_TONES)[number];

/** Max product photos per business: one vision call reads them all. */
export const MAX_PRODUCT_PHOTOS = 10;

/** Max customer groups: the engine writes one brief per group, 3 at most. */
export const MAX_CUSTOMER_GROUPS = 3;

/** What the admin types. Every string field the engine sends to the LLM is required. */
export type ManualProfileInput = {
  businessName: string;
  /** What they sell or do, one line. */
  promoting: string;
  /** Core promise, one line. */
  offer: string;
  /** What makes them different. */
  positioning: string;
  /** 2–3 sentences about the business. */
  description: string;
  /** City / area they serve. */
  geography: string;
  /** How customers buy or reach them (call, DM, walk in…). Drives the CTA line. */
  howToBuy: string;
  /** The typical customer, in plain words. */
  audienceDescription: string;
  /** 1–3 customer groups; one set of videos per group. */
  customerGroups: string[];
  tone: ManualTone;
  /** Optional: slogan, if they have one. */
  tagline: string;
  /** Optional: real, provable facts (reviews, years in business, customers served). One per line. */
  proofPoints: string[];
  /** Optional: hook ideas. */
  hookIdeas: string[];
  /** Optional: competitor names, never shown in the copy. */
  competitors: string[];
};

/** A product photo, read by a vision model so the engine can match it to a shot. */
export type ProductPhoto = {
  assetId: string;
  r2Key: string;
  /** One plain sentence of what the photo shows. */
  description: string;
  /** Shots it fits best. */
  bestFor: ProductPhotoRole[];
};

export type ProductPhotoRole = 'hook' | 'mechanism' | 'proof' | 'cta';

type TextKey = 'businessName' | 'promoting' | 'offer' | 'positioning' | 'description' | 'geography'
  | 'howToBuy' | 'audienceDescription' | 'tagline';
type ListKey = 'customerGroups' | 'proofPoints' | 'hookIdeas' | 'competitors';

export type ManualField = {
  key: TextKey | ListKey;
  label: string;
  required: boolean;
  placeholder: string;
  /** Textarea instead of an input. */
  multiline?: boolean;
  /** One item per line. */
  list?: boolean;
  help?: string;
};

export type ManualSection = { title: string; fields: ManualField[] };

export const MANUAL_SECTIONS: ManualSection[] = [
  {
    title: 'Business',
    fields: [
      { key: 'businessName', label: 'Business name', required: true, placeholder: 'Rosa’s Bakery' },
      { key: 'promoting', label: 'What they sell', required: true, placeholder: 'Custom birthday cakes and cupcakes' },
      { key: 'description', label: 'About the business', required: true, multiline: true, placeholder: 'Family bakery since 2012. Everything baked the same morning…' },
      { key: 'geography', label: 'Where', required: true, placeholder: 'Austin, TX' },
      { key: 'tagline', label: 'Slogan', required: false, placeholder: 'Baked fresh at 5am' },
    ],
  },
  {
    title: 'Offer',
    fields: [
      { key: 'offer', label: 'Main promise', required: true, placeholder: 'A custom cake ready in 48 hours' },
      { key: 'positioning', label: 'What makes them different', required: true, multiline: true, placeholder: 'Real butter, no box mixes, you taste before you order' },
      { key: 'howToBuy', label: 'How customers buy', required: true, placeholder: 'Call or text to order, or walk in', help: 'Used for the call to action.' },
    ],
  },
  {
    title: 'Customers',
    fields: [
      { key: 'audienceDescription', label: 'Typical customer', required: true, multiline: true, placeholder: 'Busy parents planning a kid’s party' },
      { key: 'customerGroups', label: 'Customer groups', required: true, list: true, placeholder: 'Busy parents\nOffice managers\nWedding planners', help: `One per line, max ${MAX_CUSTOMER_GROUPS}. One set of 6 videos per group.` },
    ],
  },
  {
    title: 'Proof & extras (optional)',
    fields: [
      { key: 'proofPoints', label: 'Real proof', required: false, list: true, placeholder: '4.9 stars on Google from 212 reviews\nBaking in Austin since 2012', help: 'Only true facts. The videos quote numbers exactly; with no proof they show the product instead.' },
      { key: 'hookIdeas', label: 'Hook ideas', required: false, list: true, placeholder: 'Your kid will talk about this cake for a year' },
      { key: 'competitors', label: 'Competitors', required: false, list: true, placeholder: 'Nothing Bundt Cakes', help: 'Never named in the videos.' },
    ],
  },
];

export const EMPTY_MANUAL_INPUT: ManualProfileInput = {
  businessName: '', promoting: '', offer: '', positioning: '', description: '', geography: '', howToBuy: '',
  audienceDescription: '', customerGroups: [], tone: 'casual', tagline: '', proofPoints: [], hookIdeas: [], competitors: [],
};

const clean = (s: unknown): string => (typeof s === 'string' ? s.trim() : '');
const cleanList = (v: unknown): string[] =>
  (Array.isArray(v) ? v : []).map(clean).filter(Boolean);

/** Trims every field and drops empty list items. Unknown input becomes empty fields. */
export function normalizeManualInput(raw: unknown): ManualProfileInput {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const tone = MANUAL_TONES.find((t) => t === r.tone) ?? 'casual';
  return {
    businessName: clean(r.businessName),
    promoting: clean(r.promoting),
    offer: clean(r.offer),
    positioning: clean(r.positioning),
    description: clean(r.description),
    geography: clean(r.geography),
    howToBuy: clean(r.howToBuy),
    audienceDescription: clean(r.audienceDescription),
    customerGroups: cleanList(r.customerGroups).slice(0, MAX_CUSTOMER_GROUPS),
    tone,
    tagline: clean(r.tagline),
    proofPoints: cleanList(r.proofPoints),
    hookIdeas: cleanList(r.hookIdeas),
    competitors: cleanList(r.competitors),
  };
}

/** Labels of required fields that are empty. Empty array = ready. */
export function missingManualFields(input: ManualProfileInput): string[] {
  return MANUAL_SECTIONS.flatMap((s) => s.fields)
    .filter((f) => f.required)
    .filter((f) => {
      const v = input[f.key];
      return Array.isArray(v) ? v.length === 0 : !v.trim();
    })
    .map((f) => f.label);
}

type Envelope<T> = { value?: T } | undefined;
type StoredProfile = {
  identity?: { businessName?: Envelope<string>; tagline?: Envelope<string>; description?: Envelope<string> };
  positioning?: {
    promoting?: Envelope<string>; offer?: Envelope<string>; positioning?: Envelope<string>;
    geography?: Envelope<string>; howToBuy?: Envelope<string>;
  };
  market?: {
    audienceDescription?: Envelope<string>; targetCustomerIndustries?: Envelope<string[]>;
    competitors?: Envelope<string[]>; proofPoints?: Envelope<Array<{ claim: string }>>;
  };
  tone?: { tone?: Envelope<string>; hooks?: Envelope<string[]> };
  products?: Envelope<ProductPhoto[]>;
};

/** Stored profile data → form values (to edit a saved business). */
export function manualInputFromProfile(data: unknown): ManualProfileInput {
  const p = (data ?? {}) as StoredProfile;
  return normalizeManualInput({
    businessName: p.identity?.businessName?.value,
    tagline: p.identity?.tagline?.value,
    description: p.identity?.description?.value,
    promoting: p.positioning?.promoting?.value,
    offer: p.positioning?.offer?.value,
    positioning: p.positioning?.positioning?.value,
    geography: p.positioning?.geography?.value,
    howToBuy: p.positioning?.howToBuy?.value,
    audienceDescription: p.market?.audienceDescription?.value,
    customerGroups: p.market?.targetCustomerIndustries?.value,
    competitors: p.market?.competitors?.value,
    proofPoints: p.market?.proofPoints?.value?.map((pp) => pp.claim),
    tone: p.tone?.tone?.value,
    hookIdeas: p.tone?.hooks?.value,
  });
}

/** Product photos saved on a profile. */
export const productPhotosFromProfile = (data: unknown): ProductPhoto[] =>
  (data as StoredProfile | null)?.products?.value ?? [];
