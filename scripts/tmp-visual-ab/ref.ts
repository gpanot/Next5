// Reference-image test: one anchor sheet (main character + full product) made first, then every beat made by FLUX.2
// with the anchor as input_urls, then a tuned QA check (with the anchor) and one retry.

import { presignObject, putObject } from '../../src/server/storage/objectStore';
import { downloadUrl } from '../../src/server/shorts/download';
import { askJson, type Bible, type Board } from './bible';

type Task = { id?: string; status?: string; error?: unknown; output?: { image_urls?: string[] } };

const reapi = async (path: string, body?: unknown): Promise<Task> => {
  const res = await fetch(`https://reapi.ai/api/v1${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${process.env.REAPI_API_KEY}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`reAPI ${path}: ${res.status} ${text.slice(0, 300)}`);
  return JSON.parse(text) as Task;
};

export let photoCount = 0;

/** FLUX.2 Pro 1K 9:16, with up to 8 reference URLs. */
export const flux = async (prompt: string, refs: string[] = []): Promise<Buffer> => {
  for (let i = 0; ; i++) {
    try {
      return await fluxOnce(prompt, refs, i === 0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  flux try ${i + 1} failed: ${msg.slice(0, 120)}`);
      if (i >= 2) throw err;
    }
  }
};

const fluxOnce = async (prompt: string, refs: string[], filter: boolean): Promise<Buffer> => {
  const task = await reapi('/images/generations', { model: 'flux-2', prompt, aspect_ratio: '9:16', resolution: '1K', content_filter: filter, ...(refs.length ? { input_urls: refs } : {}) });
  const until = Date.now() + 240_000;
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, 4_000));
    const t = await reapi(`/tasks/${task.id}`).catch(() => null);
    const status = (t?.status ?? '').toLowerCase();
    if (status === 'completed' && t?.output?.image_urls?.[0]) { photoCount++; return downloadUrl(t.output.image_urls[0]); }
    if (['failed', 'error', 'cancelled', 'expired'].includes(status)) throw new Error(`FLUX failed: ${JSON.stringify(t?.error).slice(0, 300)}`);
  }
  throw new Error('FLUX timeout');
};

export const publicUrl = async (key: string, bytes: Buffer): Promise<string> => {
  await putObject(key, bytes, 'image/jpeg');
  const url = await presignObject(key, 6 * 60 * 60);
  if (!url?.startsWith('https://')) throw new Error('no public URL');
  return url;
};

/** The anchor: the main character full-body beside (or wearing) the full product, plain bright setting. */
export const anchorPrompt = (bible: Bible, boards: (Board | null)[]) => {
  const person = boards.find((b) => b && !/^no person/i.test(b.person))?.person ?? '';
  return `Vertical reference photo, full-body, eye level: ${person || 'the product alone'}. ${
    /car|vehicle|auto/i.test(bible.business_category) ? `Standing beside ${bible.hero_product}, the whole car visible from front three-quarter.` : `Wearing ${bible.hero_product}, the full outfit clearly visible from head to toe.`
  } Plain bright neutral setting, ${bible.visual_style.replace(/\.$/, '')}. Whole body anatomically complete, feet on the ground. No text overlays.`;
};

export const refNote = (bible: Bible) =>
  `Reference image: keep the SAME person (face, hair, build, skin tone)${/car|vehicle|auto/i.test(bible.business_category) ? ` and the SAME car, ${bible.hero_product} (exact model, body shape, color, wheels)` : ' and the same style of outfit'} as in the reference. Change only the place, pose, framing and action described here.`;

const QA_SYSTEM = `You check one AI-generated photo for a brand's educational short. Image 1 is the photo; image 2 is the
reference (main character and product). Reject (ok=false) only when one of these is true:
  - anatomy error: missing/extra limbs, a body cut off unnaturally (floating torso, missing legs that should show),
    broken hands, distorted face;
  - a collage, split frame, double exposure or two images merged;
  - the place makes no sense for the action (detergent in a bedroom, a car indoors in a home);
  - garbled, misspelled or invented text or logos. The brand's REAL marks spelled correctly are fine (a real Porsche
    crest or "911 Carrera S" badge is fine; "SGR" or a made-up logo on clothing is not);
  - identity drift: the main character or the product clearly differs from the reference (other face or hair; other car
    model, body or color). Pose, outfit color and framing may change;
  - ACTION beats only: the line's key object or action is missing. HOOK and PAYOFF beats are never rejected for this.
Return JSON: {"ok": boolean, "problem": string, "fix": string (one sentence to add to the prompt; empty when ok)}`;

export const checkPhoto = (photo: Buffer, anchorUrl: string, line: string, role: string, prompt: string) =>
  askJson<{ ok?: boolean; problem?: string; fix?: string }>(QA_SYSTEM, [
    { type: 'text', text: `BEAT ROLE: ${role === 'mechanism' ? 'ACTION' : role.toUpperCase()}\nLINE: "${line}"\nPROMPT: ${prompt}` },
    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${photo.toString('base64')}` } },
    { type: 'image_url', image_url: { url: anchorUrl } },
  ]);
