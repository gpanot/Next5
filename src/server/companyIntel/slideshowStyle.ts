// server-only — never import from a 'use client' file.
// The brand's slideshow look, read with the profile: photo direction for the bank and photo prompts, slide box colors
// for the renderer. Lighting words are stripped: "cinematic" and "moody" made photos too dark (A/B test 2026-09-29).

import type { SlideshowStyle } from '../../types/admin/companyIntel';

export const DEFAULT_BOX = { boxColor: '#ffffff', boxTextColor: '#111111' };

/** The profile prompt's part for the style; the model sees the site's palette in the user message. */
/** Flat keys: nested inside one object, the model left all but photoStyle out. */
export const STYLE_PROMPT = `"photoStyle": string (max 30 words, a plain list: who and what the brand's photos show, the
settings, framing and wardrobe, at the brand's own price level and feel. Luxury car maker: "The car itself on open coastal roads
and in clean modern architecture; owners in tailored clothes; wide, uncluttered frames". Budget family car: "Families loading
groceries, busy city streets, everyday driveways; candid, close to the action". Never mention light, weather, time of day, text,
graphics, prices, offers, screens or logos),
"productAsSubject": boolean (true when the product is a physical thing people like to look at, like cars, clothes, food, homes,
jewelry; false for services and software),
"boxColor": hex (slide headline box. The brand's signature color when it has one people know (Porsche black, Coca-Cola red),
from Palette when it fits; #ffffff for soft, friendly or everyday brands), "boxTextColor": hex (readable on boxColor)`;

/** Clauses setting the light (photos must stay bright) or asking for things the photo model renders badly. */
const BANNED = /\b(dark|darker|moody|night|nighttime|dusk|dawn|sunset|sunrise|golden hour|cinematic|low[- ]key|shadowy|shadows|dim|dimly|noir|neon|evening|text|graphics?|overlays?|prices?|offers?|screens?|logos?|captions?)\b/i;
const MAX_STYLE_WORDS = 40;
const HEX = /^#[0-9a-f]{6}$/i;

/** Drops each clause that sets the light or asks for text or screens, and keeps whole clauses up to 40 words. */
export const cleanPhotoStyle = (text: string): string => {
  const kept: string[] = [];
  let words = 0;
  for (const part of text.split(/(?<=[,.;])\s+/)) {
    const count = part.split(/\s+/).length;
    if (BANNED.test(part)) continue;
    if (words + count > MAX_STYLE_WORDS) break;
    kept.push(part);
    words += count;
  }
  return kept.join(' ').replace(/[,;]\s*$/, '.').trim();
};

const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};

export const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

/** A box color the model gave, with a text color that reads on it (white or near-black when the pair is too weak). */
export const boxColors = (box: unknown, text: unknown): Pick<SlideshowStyle, 'boxColor' | 'boxTextColor'> => {
  if (typeof box !== 'string' || !HEX.test(box)) return DEFAULT_BOX;
  const boxColor = box.toLowerCase();
  if (typeof text === 'string' && HEX.test(text) && contrast(boxColor, text) >= 4.5) return { boxColor, boxTextColor: text.toLowerCase() };
  return { boxColor, boxTextColor: contrast(boxColor, '#ffffff') >= contrast(boxColor, '#111111') ? '#ffffff' : '#111111' };
};

/** The model's raw profile fields → a safe style, or undefined when it gave no usable photo direction. */
export const toSlideshowStyle = (raw: unknown): SlideshowStyle | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const photoStyle = typeof r.photoStyle === 'string' ? cleanPhotoStyle(r.photoStyle) : '';
  if (!photoStyle) return undefined;
  return { photoStyle, productAsSubject: r.productAsSubject === true, ...boxColors(r.boxColor, r.boxTextColor) };
};
