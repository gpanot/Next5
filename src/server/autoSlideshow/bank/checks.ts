// server-only — never import from a 'use client' file.
// Rule checks on bank drafts. Each returns plain reasons, sent back to the model so it can fix exactly that.

import type { BankCta, BankItem, BankMeat } from '../../../types/admin/slideshowBank';
import type { BrandLever } from '../../../types/admin/metaAds';
import { ctaBodyIsProven, ctaFitsBusiness } from '../write';
import { keepsPattern, libraryHook } from './library';

/** Meat bodies are asked at 90 characters; a few over still fit the slide. */
export const MAX_MEAT_BODY = 100;
const MIN_ITEMS = 3;
const MAX_ITEMS = 7;
export const MAX_HOOK_WORDS = 10;
const MAX_CTA_BODY = 70;
const MAX_CTA_TITLE_WORDS = 7;

/** Things that render badly as a subject. A phone in hand, its screen, logos and the brand's products are fine. */
const BANNED_PHOTO = /\b(calendar|spreadsheet|laptop|caption|sound|checklist|notebook|document|clipboard|printed|sheet|UI|text)\b/i;
/** "no text, no logos" is how the model says what is absent; those words are not in the photo. */
const ABSENT = /\b(no|never|without|free of)\b[^,.;]*/gi;

export const photoProblem = (photo: string): string | null => {
  const hit = photo.replace(ABSENT, '').match(BANNED_PHOTO);
  return hit ? `photo shows "${hit[0]}"` : null;
};

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const namesBusiness = (text: string, brand: string) => (brand.length > 2 && text.toLowerCase().includes(brand.toLowerCase())) || /\$\d/.test(text);

const itemProblems = (meat: Pick<BankMeat, 'id' | 'goal'>, item: BankItem, brand: string): string[] => {
  const where = `${meat.id} "${item.title}"`;
  const out: string[] = [];
  if (item.body.length > MAX_MEAT_BODY) out.push(`${where}: body ${item.body.length} characters (max 90)`);
  if (/proven claim/i.test(item.body)) out.push(`${where}: says "Proven claim"`);
  if (meat.goal !== 'product' && namesBusiness(`${item.title} ${item.body}`, brand)) out.push(`${where}: names the business or a price`);
  return out;
};

/** Text problems of one meat. Photo problems are separate: they are fixed by a photo-only rewrite. */
export const meatProblems = (meat: BankMeat, brand: string): string[] => [
  ...(meat.items.length < MIN_ITEMS || meat.items.length > MAX_ITEMS ? [`${meat.id}: ${meat.items.length} slides (use ${MIN_ITEMS}-${MAX_ITEMS})`] : []),
  ...meat.items.flatMap((item) => itemProblems(meat, item, brand)),
];

type HookDraft = { patternId: string; text: string; photo: string };

/** Problems of one hook for its meat: pattern kept, length, numbers only on list meats, no business, a usable photo. */
export const hookProblems = (hook: HookDraft, meat: Pick<BankMeat, 'listicle' | 'items' | 'goal'>, brand: string): string[] => {
  const out: string[] = [];
  const pattern = libraryHook(hook.patternId);
  if (!pattern) out.push('unknown patternId');
  else if (!keepsPattern(hook.text, pattern.text)) out.push('pattern words changed');
  if (words(hook.text) > MAX_HOOK_WORDS) out.push(`more than ${MAX_HOOK_WORDS} words`);
  const n = hook.text.match(/\d+/)?.[0];
  if (n && !meat.listicle) out.push('a number on a meat that is not a list');
  else if (n && Number(n) !== meat.items.length) out.push(`number ${n} but ${meat.items.length} slides`);
  if (hook.text.includes('%')) out.push('has a percentage');
  if (meat.goal !== 'product' && namesBusiness(hook.text, brand)) out.push('names the business or a price');
  const photo = photoProblem(hook.photo);
  if (photo) out.push(photo);
  return out;
};

/** CTA problems, including any number the site does not prove. */
export const ctaProblems = (cta: Omit<BankCta, 'id'>, levers: BrandLever[], siteText: string): string[] => {
  const out: string[] = [];
  if (/proven claim/i.test(cta.body)) out.push('says "Proven claim"');
  if (cta.body.length > MAX_CTA_BODY) out.push(`body ${cta.body.length} characters (max ${MAX_CTA_BODY})`);
  if ((cta.body.match(/\$\d/g) ?? []).length > 1) out.push('lists several prices');
  if (words(cta.title) > MAX_CTA_TITLE_WORDS) out.push(`title over ${MAX_CTA_TITLE_WORDS} words`);
  if (!ctaBodyIsProven(`${cta.title} ${cta.body}`, levers, siteText)) out.push('a number that is not in a proven claim');
  if (!ctaFitsBusiness(`${cta.title} ${cta.body}`, siteText)) out.push('says download/App Store but the business is not an app');
  const photo = photoProblem(cta.photo);
  if (photo) out.push(photo);
  return out;
};
