// server-only — never import from a 'use client' file.
// Photo plan of one bank slideshow (step 4, since 2026-10-10): its slide texts never change, only their photos. One small
// call casts the story: the brand cast member it follows, one setting from the Visual Bible, the clothes, and per slide
// the shot, whether the person and the brand's real product are in it. Code then builds each photo's prompt and its
// reference images (the cast member's anchor first, then the product photo). Content first: the product only shows on
// product slides and the CTA, so the slideshows never read as ads.

import type { AutoSlide } from '../../types/admin/autoSlideshow';
import type { BrandProfile } from '../../types/admin/companyIntel';
import type { ContentGoal } from '../../types/admin/contentGoals';
import type { VisualBible } from '../../types/admin/visualBible';
import type { CastPick } from '../brandCast/cast';
import type { BrandPhotoFacts } from '../brandContent/productPhotos';
import type { CostMeter } from '../metaAds/cost';
import { clip } from '../metaAds/text';
import { creativeJson } from '../shorts/llm';
import { PHOTO_RULES } from './bank/prompts';

/** Product photos per slideshow: one on the product slides or the CTA, two at most. */
const MAX_PRODUCT_SLIDES = 2;

export type PlanInput = {
  slides: Omit<AutoSlide, 'imageKey'>[];
  goal: ContentGoal | null;
  profile: BrandProfile;
  bible: VisualBible | null;
  cast: CastPick | null;
  photos: BrandPhotoFacts[];
};

const SYSTEM = `You are the photo director of a TikTok photo slideshow for a brand. The slide texts are final: you only
plan the photos behind them, so the slideshow looks like ONE story by this brand.
- Every photo shows what its slide says (keep the action of the slide's photo idea). The content comes first.
  The photo idea's place is only a draft: always use your setting instead.
- One main person carries the story (when a main person is given): put them on every slide where a person fits; on a
  "story" slideshow on every slide. "none" for a place or object shot, "other" when the slide needs someone else.
- One real-life setting for the whole slideshow, where the audience really lives this moment (home, gym, park, street,
  office, car...), picked from the brand's places. Never a photo studio or an empty loft: these are real moments, not a
  shoot. A slide may move to a second real place when its text needs it.
- Vary the shots: never the same shot type twice in a row (wide, medium, detail of hands or product in use...).
  Hook: the most striking shot. CTA: the main person enjoying the result.
- The brand's own product photos (P1, P2...) may only go on slides marked "product allowed", and only when the slide
  is about the product. Never on teaching slides: these are not ads.
- ${PHOTO_RULES}
Return JSON with flat keys only:
"setting": the main place, 5-12 words,
"wardrobe": what the main person wears on every slide, 8-20 words, concrete pieces and colors (the brand's own product
  when it is clothing, e.g. "slate-grey high-waisted leggings, matching sports bra, white sneakers"). The same on every
  slide, except a product slide that shows another product,
and for each slide N (1 = first slide):
"slide_N_scene": one sentence, max 35 words: shot type, action and place. Call the main person "the main person"; never describe their face or body,
"slide_N_person": "main" | "other" | "none",
"slide_N_product": "P1"... or "none".`;

const bibleText = (bible: VisualBible | null, profile: BrandProfile) =>
  bible
    ? `BRAND LOOK (Visual Bible):
  category: ${bible.business_category}
  photo style: ${bible.visual_style}
  places (pick from these, never a studio): ${bible.environments}
  wardrobe: ${bible.wardrobe}
  shot types: ${bible.shot_vocabulary}
  product visibility: ${bible.product_visibility}
  avoid: ${bible.avoid}`
    : `BRAND LOOK: ${profile.slideshowStyle?.photoStyle ?? 'bright, real-life photos of the audience'}`;

/** Slides the product may show on: every slide of a product slideshow, else only the CTA. */
const productAllowed = (slide: Pick<AutoSlide, 'role'>, goal: ContentGoal | null) => goal === 'product' || slide.role === 'cta';

const userText = (input: PlanInput, products: BrandPhotoFacts[]) => {
  const { profile, cast, goal, slides } = input;
  const productLines = products.map((p, i) => `P${i + 1}: ${p.productName || p.description} (${p.photoType.replace(/_/g, ' ')})`);
  return `BRAND: ${profile.brandName}. SELLS: ${profile.valueProp}
AUDIENCE: ${profile.audience}
${bibleText(input.bible, profile)}
MAIN PERSON: ${cast ? `${cast.name}, from the brand's cast` : 'none: people are "other" or "none"'}
SLIDESHOW GOAL: ${goal ?? 'teach'}
BRAND PRODUCT PHOTOS: ${productLines.length ? `\n${productLines.join('\n')}` : 'none'}
SLIDES:
${slides.map((s, i) => `${i + 1}. [${s.role}${productAllowed(s, goal) ? ', product allowed' : ''}] "${s.title}${s.body ? ` — ${s.body}` : ''}" · photo idea: ${s.photoPrompt ?? 'none'}`).join('\n')}`;
};

type SlidePlan = { scene: string; person: 'main' | 'other' | 'none'; product: BrandPhotoFacts | null };
type Plan = { setting: string; wardrobe: string; slides: (SlidePlan | null)[] };

const str = (v: unknown, max: number) => (typeof v === 'string' ? clip(v.replace(/\s+/g, ' ').trim(), max) : '');

/** The model's flat reply as a plan; the product rules are enforced here, whatever the model said. */
const toPlan = (raw: Record<string, unknown>, input: PlanInput, products: BrandPhotoFacts[]): Plan => {
  let productSlides = 0;
  const slides = input.slides.map((slide, i) => {
    const n = i + 1;
    const scene = str(raw[`slide_${n}_scene`], 400);
    if (!scene) return null;
    const said = str(raw[`slide_${n}_person`], 10).toLowerCase();
    // Without a cast member, "main" is just someone in the scene.
    const person: SlidePlan['person'] = said === 'main' ? (input.cast ? 'main' : 'other') : said === 'other' ? 'other' : 'none';
    const index = Number(str(raw[`slide_${n}_product`], 5).replace(/^P/i, '')) - 1;
    const wanted = Number.isInteger(index) ? (products[index] ?? null) : null;
    const product = wanted && productAllowed(slide, input.goal) && productSlides < MAX_PRODUCT_SLIDES ? wanted : null;
    if (product) productSlides += 1;
    return { scene, person, product } satisfies SlidePlan;
  });
  return { setting: str(raw.setting, 160), wardrobe: str(raw.wardrobe, 200), slides };
};

/** A product photo goes on the slide as it is only when it reads as a real photo, not an ad, and no person is asked for. */
const usesPhotoAsIs = (plan: SlidePlan) => Boolean(plan.product?.usableAsBackground && !plan.product.looksLikeAd && plan.person !== 'main');

const PERSON_NOTE = 'keep the SAME person (face, hair, skin tone, build); change the pose, place and clothes as described here';
const PRODUCT_NOTE = 'show this EXACT product (same shape, colors and details); do not copy that photo\'s person, pose or background';

/** The slide's photo fields from its plan: prompt, reference images and what they are, or the brand photo used as it is. */
const planToSlide = (slide: Omit<AutoSlide, 'imageKey'>, plan: SlidePlan, all: Plan, cast: CastPick | null): Omit<AutoSlide, 'imageKey'> => {
  if (plan.product && usesPhotoAsIs(plan)) return { ...slide, photoPrompt: `(Brand photo) ${plan.product.description}`, brandPhotoKey: plan.product.r2Key };
  const main = plan.person === 'main' && cast;
  const productRef = plan.product?.usableAsReference ? plan.product : null;
  const refs = [...(main ? [cast.imageKey] : []), ...(productRef ? [productRef.r2Key] : [])];
  const notes = [
    ...(main ? [`Image 1 is the main person: ${PERSON_NOTE}.`] : []),
    ...(productRef ? [`Image ${main ? 2 : 1} is the brand's product (${productRef.productName || 'the product'}): ${PRODUCT_NOTE}.`] : []),
  ];
  // The member's own everyday style is for the anchor photo; in a slideshow they wear the planned clothes.
  const look = all.wardrobe ? cast?.look.replace(/\s*Everyday style:.*$/, '') : cast?.look;
  const scene = main ? `${plan.scene} The main person: ${look} Wearing ${all.wardrobe || 'everyday clothes'}.` : plan.scene;
  const product = plan.product && !productRef ? ` The product shown: ${plan.product.productName || plan.product.description}.` : '';
  return {
    ...slide,
    photoPrompt: `${scene}${product}`,
    ...(refs.length ? { photoRefs: refs, photoRefNote: notes.join(' ') } : {}),
    ...(main ? { castId: cast.id } : {}),
  };
};

/** The brand photos the plan may pick from (P1, P2... in this order): app screens only when they can be a slide as they are. */
const planProducts = (photos: BrandPhotoFacts[]) => photos.filter((p) => p.photoType !== 'screen_ui' || p.usableAsBackground);

/** The slides with the model's plan applied (pure, so the rules can be tested). A slide the reply skipped keeps its photo idea. */
export const slidesFromReply = (raw: Record<string, unknown>, input: PlanInput): Omit<AutoSlide, 'imageKey'>[] => {
  const plan = toPlan(raw, input, planProducts(input.photos));
  return input.slides.map((slide, i) => {
    const p = plan.slides[i];
    return p ? planToSlide(slide, p, plan, input.cast) : slide;
  });
};

/**
 * The slides with their planned photos. Never throws: when the plan call fails, the slides keep the bank's photo ideas
 * (a photo without references, as before the plan).
 */
export const planSlidePhotos = async (input: PlanInput, meter: CostMeter): Promise<Omit<AutoSlide, 'imageKey'>[]> => {
  try {
    const raw = await creativeJson<Record<string, unknown>>(SYSTEM, userText(input, planProducts(input.photos)), meter, 'Photo plan');
    return slidesFromReply(raw, input);
  } catch (err) {
    console.warn('[auto-slideshow] photo plan failed, bank photo ideas kept:', err instanceof Error ? err.message.slice(0, 200) : err);
    return input.slides;
  }
};

/** The brand look added to every generated photo: the Visual Bible's photo style, else the profile's. */
export const brandLook = (profile: BrandProfile | null): string | undefined => profile?.visualBible?.visual_style || profile?.slideshowStyle?.photoStyle;
