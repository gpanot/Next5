// server-only — never import from a 'use client' file.
//
// Photo prompts for Blitz story shots, written per story so its pictures feel like one video of this brand: the same
// main character and place through the story, the exact moment of each line, a different camera on each shot, and the
// brand's own visual style (Settings: the profile's slideshowStyle). Bank stories get theirs when the story is written
// (blitzBank.ts), so a batch only renders them; older stories get them here when an image is needed.
// The model gets the scene, then photoPrompt adds the brand look and the shared bright style (autoSlideshow/photos.ts).

import { chatJson } from '../../ai/openai';
import { categoryLabel } from './categories';

/** What the photos must feel like: the business and its look. */
export type PhotoBrand = {
  business: string;
  /** What it sells / does. */
  sells: string;
  /** Who and what the photos show, where, how framed (profile.visual.slideshowStyle.photoStyle). */
  look: string | null;
  /** The product itself may be a photo's subject. */
  productAsSubject: boolean;
};

export type ShotPhoto = { prompt: string; description: string };

/** One shot to picture: `label` says what the beat is in this story's format ("Myth", "Step 1", "After"). */
export type PhotoShot = { id: string; role: string; label: string; text: string; intent?: string };
/** A story's shots, written together so they share a character and a place. */
export type PhotoStory = { id: string; lines: string; shots: PhotoShot[] };

const RULES = `You write photo prompts for the background pictures of a short vertical video (9:16) that tells one story in
short on-screen lines. Each picture sits behind one line. A viewer must get the line from the picture alone.

For each shot, a prompt of 40-70 words:
- The exact moment of its line, with the concrete things the line names (the food, the tool, the place, the gesture).
- Real-looking photography of a person or place in the audience's world. Follow the brand's Visual style for who and what
  appears, the setting and the clothes: the pictures must feel like this brand, not like stock.
- One story = one main character and one home or workplace: describe them the same way in every shot of the story
  (age range, look, clothes, the room), so the shots feel like one video.
- A different camera on every shot of a story: wide scene, medium shot, close-up on hands and objects in action,
  over-the-shoulder, low angle, high angle, view through a doorway... Never the same framing twice in a story.
- Body language fits the beat: problem and old way = real, specific frustration; fix = ease and control; proof and
  result = visible relief, the result in the frame; cost of waiting = the loss showing.
- When the line is about the product, show it in use as it really looks (an app on a phone held naturally, the product
  in its real setting). When "Product as subject" is yes, the product may be the subject. The brand may appear.
- Bright daylight. Never: dusk, night, golden hour, moody or cinematic light, close-up faces, readable text, captions,
  documents, clipboards, paper or a lone object as the whole subject.
- Describe only what is in the photo (no "no text").
Also "description": one plain sentence of what the picture shows (for search).
Return JSON only, one item per shot, "key" copied exactly: {"items":[{"key":"...","prompt":"...","description":"..."}]}`;

const brandBlock = (brand: PhotoBrand, audience: string, categories: string[]) => [
  `BUSINESS: ${brand.business}: ${brand.sells}`,
  `AUDIENCE: ${audience}${categories.length ? ` (${categories.map(categoryLabel).join(', ')})` : ''}`,
  `Visual style: ${brand.look || 'everyday scenes of the audience at home or at work'}`,
  `Product as subject: ${brand.productAsSubject ? 'yes' : 'no'}`,
].join('\n');

const storyBlock = (story: PhotoStory, keyOf: (shot: PhotoShot) => string) => [
  `STORY ${story.id}: ${story.lines}`,
  ...story.shots.map((s) => `${keyOf(s)} | ${s.label} (${s.role} shot) | line: "${s.text}"${s.intent ? ` | wanted: ${s.intent}` : ''}`),
].join('\n');

/**
 * One call: a prompt per shot of every story, by `${story.id}:${shot.id}`. Shots the model skipped are missing.
 * Never throws (empty on failure).
 */
export async function writeShotPhotos(brand: PhotoBrand, audience: string, categories: string[], stories: PhotoStory[]): Promise<Map<string, ShotPhoto>> {
  const out = new Map<string, ShotPhoto>();
  if (stories.every((s) => s.shots.length === 0)) return out;
  // Short keys ("s0") survive the round trip; free-text keys came back reworded.
  const keys: string[] = [];
  const keyOf = (story: PhotoStory) => (shot: PhotoShot) => `s${keys.push(`${story.id}:${shot.id}`) - 1}`;
  const user = [brandBlock(brand, audience, categories), ...stories.map((s) => storyBlock(s, keyOf(s)))].join('\n\n');
  const result = await chatJson<{ items?: Array<{ key?: string; prompt?: string; description?: string }> }>(
    [{ role: 'system', content: RULES }, { role: 'user', content: user }],
    { model: 'gpt-5.5', reasoningEffort: 'low', maxTokens: 6_000, timeoutMs: 90_000 },
  ).catch((err: unknown) => {
    console.error('[shotPhotos] prompts not written:', err instanceof Error ? err.message : err);
    return null;
  });
  for (const item of result?.items ?? []) {
    const id = keys[Number(item.key?.replace(/^s/, ''))];
    const prompt = item.prompt?.trim();
    if (id && prompt) out.set(id, { prompt, description: item.description?.trim() || prompt.slice(0, 120) });
  }
  return out;
}
