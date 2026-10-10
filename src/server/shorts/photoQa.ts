// server-only — never import from a 'use client' file.
// The photo check after generation (vision model): rejects broken anatomy, collages, places that make no sense for the
// action, garbled or invented lettering, and drift from the anchor photo. Tuned in the A/B tests of 2026-10-09: the first
// version rejected the brand's real marks (a correct Porsche crest), and its "removed" retries turned a Porsche cockpit
// into a generic car; and it rejected abstract hook lines that no photo can show literally. A failed check never fails
// the short: the photo is made once more with the check's fix, and the second photo is kept either way.

import sharp from 'sharp';
import type { CostMeter } from '../metaAds/cost';
import type { ShortBeat } from '../../types/admin/shorts';
import { creativeJson, smartModel, type UserContent } from './llm';

const SYSTEM = `You check one AI-generated photo for a brand's educational short. Image 1 is the photo; image 2, when given,
is the reference (main character and product). Reject (ok=false) only when one of these is true:
  - anatomy error: missing/extra limbs, a body cut off unnaturally (floating torso, missing legs that should show),
    broken hands, distorted face;
  - a collage, split frame, double exposure or two images merged;
  - the place makes no sense for the action (detergent poured in a bedroom, a car indoors in a home);
  - garbled, misspelled or invented text or logos. The brand's REAL marks spelled correctly are fine (a real Porsche
    crest or "911 Carrera S" badge is fine; "SGR" or a made-up logo on clothing is not);
  - identity drift: the main character or the product clearly differs from the reference (other face or hair; other car
    model, body or color). Pose, outfit color and framing may change;
  - ACTION beats only: the line's key object or action is missing. HOOK and PAYOFF beats are never rejected for this.
Return JSON: {"ok": boolean, "problem": string (empty when ok), "fix": string (one sentence to add to the image prompt, empty when ok)}`;

export type QaVerdict = { ok: boolean; problem: string; fix: string };

const smallJpeg = async (photo: Buffer): Promise<string> => {
  const jpeg = await sharp(photo).resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
};

/** The check of one photo. A check that cannot run passes the photo (it never blocks a short). */
export const checkPhoto = async (photo: Buffer, beat: ShortBeat, prompt: string, anchorUrl: string | null, meter: CostMeter): Promise<QaVerdict> => {
  try {
    const role = beat.role === 'mechanism' ? 'ACTION' : beat.role.toUpperCase();
    const user: UserContent = [
      { type: 'text', text: `BEAT ROLE: ${role}\nLINE: "${beat.text}"\nPROMPT: ${prompt}` },
      { type: 'image_url', image_url: { url: await smallJpeg(photo), detail: 'high' } },
      ...(anchorUrl ? [{ type: 'image_url' as const, image_url: { url: anchorUrl, detail: 'low' as const } }] : []),
    ];
    const raw = await creativeJson<{ ok?: unknown; problem?: unknown; fix?: unknown }>(SYSTEM, user, meter, 'Photo check', smartModel());
    const text = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 400) : '');
    return { ok: raw.ok !== false, problem: text(raw.problem), fix: text(raw.fix) };
  } catch (err) {
    console.warn('[shorts] photo check skipped:', err instanceof Error ? err.message.slice(0, 160) : err);
    return { ok: true, problem: '', fix: '' };
  }
};
