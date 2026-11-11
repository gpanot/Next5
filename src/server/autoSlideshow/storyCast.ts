// server-only — never import from a 'use client' file.
// A story slideshow names one person in its bank text ("Mai loved workouts..."), but its face comes from the brand cast,
// picked later. This puts the cast member's first name and pronouns into the story, so the text and the photos show the
// same person (2026-10-21: an EQL story named "Mai" over Amara's photos).

import type { AutoSlide } from '../../types/admin/autoSlideshow';
import type { CastPick } from '../brandCast/cast';
import type { CostMeter } from '../metaAds/cost';
import { creativeJson } from '../shorts/llm';

type Slide = Omit<AutoSlide, 'imageKey'>;

const SYSTEM = `You fix the main person of a TikTok story slideshow. Give them the NAME given and pronouns that fit
GENDER. Change nothing else: same words, same meaning, same length. A slide that does not mention them stays exactly the same.
Return JSON with flat keys only: "slide_N_title" and "slide_N_body" for each slide N (1 = first slide).`;

/** The cast member's first name ("Amara, 28" → "Amara") and gender, read from their look ("28 years old. Woman with..."). */
const castPerson = (cast: CastPick) => ({
  name: cast.name.split(',')[0]?.trim() || cast.name,
  gender: /\bwoman\b/i.test(cast.look) ? 'woman (she/her)' : /\bman\b/i.test(cast.look) ? 'man (he/him)' : 'unknown: keep the pronouns',
});

const text = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v.replace(/\s+/g, ' ').trim() : fallback);

/** The story's slides naming the cast member. Never throws: on a failed call the slides stay as they were. */
export const castStory = async (slides: Slide[], cast: CastPick | null, meter: CostMeter): Promise<Slide[]> => {
  if (!cast) return slides;
  const { name, gender } = castPerson(cast);
  const user = `NAME: ${name}\nGENDER: ${gender}\nSLIDES:\n${slides.map((s, i) => `${i + 1}. title: ${s.title}\n   body: ${s.body}`).join('\n')}`;
  try {
    const raw = await creativeJson<Record<string, unknown>>(SYSTEM, user, meter, 'Story cast');
    return slides.map((s, i) => ({ ...s, title: text(raw[`slide_${i + 1}_title`], s.title), body: text(raw[`slide_${i + 1}_body`], s.body) }));
  } catch (err) {
    console.warn('[auto-slideshow] story cast failed, bank names kept:', err instanceof Error ? err.message.slice(0, 200) : err);
    return slides;
  }
};
