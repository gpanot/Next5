// Visual Bible test (A/B, not production): one vision call over the brand's own photos + profile, then a storyboard
// that keeps one persona and varies the scene, then per-beat shot plans that all share the bible.

import type { ShortBeat, ShortInputs } from '../../src/types/admin/shorts';

const OPENAI = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-5.4-mini';

type Part = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

export const askJson = async <T>(system: string, user: Part[] | string): Promise<T> => {
  const res = await fetch(OPENAI, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, reasoning_effort: 'low', response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${text.slice(0, 400)}`);
  return JSON.parse(JSON.parse(text).choices[0].message.content) as T;
};

/** Up to `max` content photos from the homepage HTML (no svg, icons, logos). */
export const siteImages = async (url: string, hero: string | null, max = 5): Promise<string[]> => {
  const html = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then((r) => r.text()).catch(() => '');
  const found = [...html.matchAll(/(?:src|data-src|srcset)="([^"]+?\.(?:jpe?g|webp|png)[^"\s]*)/gi)].map((m) => m[1]!.split(' ')[0]!);
  const abs = found.map((s) => (s.startsWith('//') ? `https:${s}` : s.startsWith('/') ? new URL(s, url).href : s)).filter((s) => s.startsWith('http'));
  const ok = abs.filter((s) => !/logo|crest|icon|favicon|sprite|badge|flag|payment|\.svg/i.test(s));
  return [...new Set([...(hero ? [hero] : []), ...ok])].slice(0, max);
};

export type Bible = Record<string, string>;

const BIBLE_SYSTEM = `You are the art director of a brand. From its own photos and its profile, write the brand's VISUAL BIBLE:
the rules every photo of its educational short videos must follow so they look like this brand, not like stock.
Describe what the BRAND'S OWN PHOTOS show. When there are no people in them, infer the people from the audience and price level.

Return JSON with flat string keys only:
"business_category": 2-5 words,
"hero_product": 5-15 words: the ONE exact product the video shows, named with brand, model and color as seen in the photos or text (e.g. "a silver Porsche 911 Carrera coupe", "an EQL matching sports bra and leggings set in slate grey"),
"primary_subject": what most photos should center on (e.g. "the product worn by the customer in motion", "the car itself", "the agent with a client", "the app on a phone in use"),
"person_age_range": e.g. "25-35", or "none" when people should not appear,
"person_look": 15-30 words: build, styling, grooming, energy, as the brand's photos show its people,
"wardrobe": 10-25 words: what people wear (the brand's own product when it is clothing),
"environments": 6-8 REAL-LIFE places where this customer lives with the product, at the brand's price level, comma separated, specific (e.g. for premium activewear: "bright boutique pilates studio, sunlit upscale apartment bedroom, clean modern laundry nook, outdoor tennis court"). The brand's photo studio may be one of them, never most of them. No offices unless the brand is about offices,
"visual_style": 15-30 words: photographic look (editorial lifestyle, polished, minimal, documentary...) at the brand's price level. Always bright, well-exposed daylight; never cinematic, moody or dark,
"product_visibility": 10-25 words: how and how often the product appears,
"shot_vocabulary": 6-8 shot types that fit THIS category, separated by " | " (e.g. for apparel: "full-body outfit in motion | fabric detail close-up | ...")
"consistency_rules": 15-30 words: what stays the same across all shots of one video,
"avoid": 10-25 words: looks that would be off-brand (in style, setting, price level),
"design_story": 30-50 words: the brand's visual identity in plain words.`;

export const buildBible = async (inputs: ShortInputs, profile: Record<string, unknown>, images: string[]): Promise<Bible> => {
  const style = (profile.slideshowStyle ?? {}) as Record<string, unknown>;
  const text = `BRAND: ${inputs.brandName}
VALUE PROP: ${profile.valueProp}
AUDIENCE: ${inputs.audience}
TONE: ${inputs.tone}
CATEGORIES: ${(profile.productCategories as string[] | undefined)?.join(', ')}
PHOTO STYLE (from site text): ${style.photoStyle ?? 'none'}
PALETTE: ${(profile.palette as string[] | undefined)?.join(', ')}
The brand's own photos follow (${images.length}).`;
  return askJson<Bible>(BIBLE_SYSTEM, [{ type: 'text', text }, ...images.map((url) => ({ type: 'image_url' as const, image_url: { url } }))]);
};

export const bibleBlock = (b: Bible) => `VISUAL BIBLE (the brand's look; every shot follows it):
  category       : ${b.business_category}
  hero product   : ${b.hero_product}
  primary subject: ${b.primary_subject}
  people         : age ${b.person_age_range}; ${b.person_look}
  wardrobe       : ${b.wardrobe}
  environments   : ${b.environments}
  visual style   : ${b.visual_style}
  product        : ${b.product_visibility}
  consistency    : ${b.consistency_rules}
  avoid          : ${b.avoid}`;

const STORY_SYSTEM = `You storyboard a 20-40 second vertical EDUCATIONAL short for a brand, one entry per beat. The brand teaches, never sells.

For EACH beat give flat keys:
  beat_N_shot   : one shot type from the bible's shot vocabulary, adapted to the line (6-14 words)
  beat_N_setting: the real place where THIS line's action happens (6-14 words). Use the bible's environments for
                  brand-world beats (hook, payoff, wearing or using the product); for a practical action use the room
                  where people really do it (washing = laundry room or bathroom sink, cooking = kitchen, charging = garage),
                  styled at the brand's price level. Ask: would a real person do this here? If not, change the place.
  beat_N_person : who is in frame, 6-16 words, or "no person"
  beat_N_product: how the product appears in this shot (4-12 words), or "not shown"

RULES:
  - ONE main character for the whole video, described the same way every time (same age, look, hair), dressed per the
    bible's wardrobe. Only her or his OUTFIT may change between settings. A second person may appear where the line needs
    it (a friend, a client), also within the bible's age range and look.
  - Variety comes from the SCENE: never the same shot type twice in a row, at least 3 different settings, mix wide,
    medium and close-up.
  - The LINE'S ACTION WINS over posing: the shot shows the exact thing the line teaches (measuring detergent = her hand
    pouring detergent into a measuring cap; testing brakes = the car braking on a road). Pick the real place where that
    action happens, styled at the brand's price level. Never a catalog pose that ignores the line.
  - ACTION BEATS (mechanism): the line's key object or action is IN the frame and named in the shot (detergent line =
    the detergent bottle and cap in her hands; braking line = the car braking on a road). Abstract hook and payoff
    lines: show the main character with the product in a clear, calm moment.
  - Light words (golden, sunset, dusk, cinematic, moody) are never part of a setting: all shots are bright daylight.
  - FRAMING AND PEOPLE: a close-up or detail shot (wheel, fabric, hands, badge) has either NO person or only the part of
    the body that naturally enters the crop (hands, forearm, torso edge). A full person only in medium or wide shots,
    with the whole body that the frame shows anatomically complete (feet on the ground in full-body shots).
  - Never mention labels, signs, text, prices or numbers: say the object itself ("the detergent bottle and its cap").
  - Follow "avoid" strictly.
  - The last beat (payoff) may return to the first beat's setting to close the loop.

Return JSON with flat keys only.`;

export type Board = { shot: string; setting: string; person: string; product: string };

export const storyboard = async (beats: ShortBeat[], bible: Bible, inputs: ShortInputs): Promise<(Board | null)[]> => {
  const user = `BRAND: ${inputs.brandName}\nAUDIENCE: ${inputs.audience}\n\n${bibleBlock(bible)}\n  shot vocabulary: ${bible.shot_vocabulary}\n\nBEATS:\n${beats.map((b) => `  beat_${b.idx} (${b.role}): "${b.text}"`).join('\n')}`;
  const raw = await askJson<Record<string, string>>(STORY_SYSTEM, user);
  return beats.map((b) => {
    const get = (k: string) => raw[`beat_${b.idx}_${k}`]?.trim() ?? '';
    return get('shot') && get('setting') ? { shot: get('shot'), setting: get('setting'), person: get('person'), product: get('product') } : null;
  });
};

const boardLine = (b: Board | null, i: number) => (b ? `beat_${i}: ${b.shot} · ${b.setting} · ${b.person} · product: ${b.product}` : `beat_${i}: (free)`);

const SHOT_SYSTEM = (beat: ShortBeat, inputs: ShortInputs, bible: Bible, boards: (Board | null)[]) => `You are planning the photo for ONE beat of a 20-40 second vertical educational reel by ${inputs.brandName}.

This is beat ${beat.idx} (role ${beat.role}, ~${beat.spanS.toFixed(1)}s of audio). The photo shows the concrete thing THIS line
teaches, inside the brand's world. No stock-photo handshakes, no smiling at the camera, never an ad or studio hero shot.

${bibleBlock(bible)}

THE WHOLE STORYBOARD (keep the same main character exactly as described; this beat is beat_${beat.idx}):
${boards.map(boardLine).join('\n')}

THIS BEAT (required): ${boardLine(boards[beat.idx] ?? null, beat.idx)}

COMPOSITION (non-negotiable):
- 9:16 vertical. Subject centered or slightly above center. The LOWER THIRD calm and simple (floor, ground, surface): say
  what fills it ("open studio floor below"); never write layout rules.
- Screens and phones at an angle or from behind, no readable interface.
- Realistic: real products in real colors and materials, natural proportions, nothing out of place.
- No text, letters, numbers, prices, logos or watermarks in the image.
- Bright, well-exposed daylight. Never night, dusk, moody, neon or cinematic light.

MOTION: "motion_hint" one of static | slow_zoom_in | slow_zoom_out | pan_left | pan_right | ken_burns (hook: slow_zoom_in,
payoff: static). "motion_action": ONE sentence (8-20 words) of what visibly happens next at real-life speed, using only
people and objects in the photo. Never "slowly", "gently", "in slow motion".

Return JSON: {"image_prompt": string, "motion_hint": string, "motion_action": string}`;

const SHOT_USER = (beat: ShortBeat, narration: string) => `FULL NARRATION: ${narration}

THIS BEAT'S LINE: "${beat.text}"

image_prompt: 50-90 words. Start with the shot type. The line's concrete action and objects MUST be in it (not a pose).
Never mention labels, signs, text, prices or numbers: name the object itself. Products and packaging are plain, with no
brand names, logos or badges written on them. In a close-up, a person appears only as hands or a natural partial crop. Describe the main character exactly as the storyboard does (age,
look, outfit), the setting, the action of this line, the product as the storyboard says, the lower third, the light.`;

export const planShot = (beat: ShortBeat, narration: string, inputs: ShortInputs, bible: Bible, boards: (Board | null)[]) =>
  askJson<{ image_prompt?: string; motion_hint?: string; motion_action?: string }>(SHOT_SYSTEM(beat, inputs, bible, boards), SHOT_USER(beat, narration));

/** Replaces the global documentary PHOTO_STYLE: the bible's style, persona and avoid list. */
export const bibleStyle = (b: Bible) =>
  `Photographic style: ${b.visual_style.replace(/\.$/, '')}. True-to-life colors, natural skin texture, vertical framing. No text, no watermarks, no readable screens.`;

const QA_SYSTEM = `You check one AI-generated photo for a brand's educational short before it is used. Be strict.
Reject (ok=false) when ANY of these is true:
  - anatomy error: missing or extra limbs, a body cut off unnaturally (floating torso, legs missing where they should
    show), merged or broken hands, distorted face;
  - the place makes no sense for the action (detergent poured in a bedroom, a car inside a kitchen);
  - visible text, letters, logos, badges or numbers (garbled or not) on products, plates, packaging or clothing;
  - it does not show the line it illustrates.
Return JSON: {"ok": boolean, "problem": string (empty when ok), "fix": string (one sentence to add to the prompt, empty when ok)}`;

export const checkPhoto = (photo: Buffer, line: string, prompt: string) =>
  askJson<{ ok?: boolean; problem?: string; fix?: string }>(QA_SYSTEM, [
    { type: 'text', text: `LINE: "${line}"\nPROMPT: ${prompt}` },
    { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${photo.toString('base64')}` } },
  ]);
