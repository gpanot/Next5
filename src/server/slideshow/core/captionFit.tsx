// server-only — never import from a 'use client' file.
// Caption Auto Fit for generated deck cards: the same vision check as the editor's Auto Fit button (blitzCaptionFit.ts),
// run on every shot before the cards are saved, so ideas start with the caption on a clear spot of their real picture.
// Per shot: the frame the video shows (photo, or the clip at its trim start) → the caption drawn on it in the Default
// style → Auto Fit. A shot that cannot be fitted keeps its text-safe-zone position.
// Fits and each frame's heads are saved per asset (captionFitCache.ts): a batch can place every caption from saved
// data alone in milliseconds and run the vision Auto Fit later, in the background, for the shots that lacked a fit.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { BLITZ_DEFAULT_TEXT_CONFIG, BLITZ_SLIDESHOW_TEXT_DEFAULTS } from '../../../config/blitzLab';
import { getObjectBuffer, getPresignedUrl } from '../../../lib/r2';
import { FFMPEG_PATH } from '../../admin/cloneUtils';
import { lineWidths } from '../../autoSlideshow/textPlacement';
import { autoFitCaption, clearOfHeads } from '../../labs/blitzCaptionFit';
import type { BackgroundRegions } from '../../labs/blitzAutoFitGeometry';
import { fitCacheKey, loadFits, regionsKey, saveFit, type SavedFits } from './captionFitCache';
import type { DeckItem, DeckShot } from './deckAssembly';

const execFileAsync = promisify(execFile);

const W = 1080;
const H = 1920;
/** Snapshots go to the model at half size, like the editor's. */
const S = 0.5;
/** Shots fitted at once: each is two model calls (3-6 s) plus a frame grab. A batch has 40-60 to fit: all at once, so the
 *  whole fit takes about one shot's time. */
const CONCURRENCY = 64;
/** A shot slower than this is logged with where its time went. */
const SLOW_SHOT_MS = 8_000;
/** Montserrat Bold's average glyph width as a share of the font size, rounded up (estimates the caption's box). */
const BOLD_CHAR = 0.62;
/** The caption style every generated video starts with (the editor's "Default"). */
const STYLE = { ...BLITZ_DEFAULT_TEXT_CONFIG, ...BLITZ_SLIDESHOW_TEXT_DEFAULTS };

const FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@700';
let fontPromise: Promise<ArrayBuffer | null> | null = null;

/** Montserrat Bold, fetched once per instance. Without a user agent Google serves TTF, which Satori reads. */
const loadFont = (): Promise<ArrayBuffer | null> => {
  fontPromise ??= fetch(FONT_CSS_URL)
    .then((res) => res.text())
    .then((css) => {
      const url = css.match(/src: url\((.+?)\)/)?.[1];
      return url ? fetch(url).then((r) => r.arrayBuffer()) : null;
    })
    .catch(() => null);
  return fontPromise;
};

const isImageKey = (key: string) => /\.(jpe?g|png|webp|avif)$/i.test(key);

/** The clip's frame at `atSec`, read straight from storage (ffmpeg seeks over HTTP, no full download). */
async function videoFrame(key: string, atSec: number): Promise<Buffer | null> {
  const url = await getPresignedUrl(key, 600);
  if (!FFMPEG_PATH || !url) return null;
  const { stdout } = await execFileAsync(
    FFMPEG_PATH,
    ['-ss', String(Math.max(0, atSec) + 0.05), '-i', url, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'mjpeg', 'pipe:1'],
    { encoding: 'buffer', maxBuffer: 20 * 1024 * 1024, timeout: 30_000 },
  );
  return stdout.length > 0 ? stdout : null;
}

/** The shot's first visible frame as a half-size 9:16 JPEG, cropped like the video (cover). */
async function backgroundJpeg(shot: DeckShot): Promise<Buffer | null> {
  const key = shot.assetKey;
  if (!key) return null;
  const raw = isImageKey(key) ? await getObjectBuffer(key) : await videoFrame(key, shot.trimStart ?? 0);
  if (!raw) return null;
  return sharp(raw).rotate().resize(W * S, H * S, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer();
}

/** The caption's box in canvas px, as CaptionLayer lays it out (centred, bottom edge at positionY). */
function captionRect(text: string, positionY: number) {
  const lines = lineWidths(text, STYLE.fontSize, BOLD_CHAR, W - STYLE.safeZonePadding * 2);
  const w = Math.max(0, ...lines);
  const h = lines.length * STYLE.fontSize * 1.25;
  return { x: (W - w) / 2, y: positionY * H - h, w, h };
}

/** The slide as the video shows it: the frame with the caption drawn like CaptionLayer (Default style, no stroke). */
async function compositeJpeg(bg: Buffer, text: string, positionY: number, font: ArrayBuffer): Promise<Buffer> {
  const uri = `data:image/jpeg;base64,${bg.toString('base64')}`;
  const res = new ImageResponse(
    (
      <div style={{ width: W * S, height: H * S, display: 'flex', position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={uri} width={W * S} height={H * S} style={{ position: 'absolute', top: 0, left: 0 }} />
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: H * S * (1 - positionY), display: 'flex',
          flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', padding: `0 ${STYLE.safeZonePadding * S}px`,
        }}>
          <div style={{
            display: 'flex', textAlign: 'center', justifyContent: 'center', fontFamily: 'Montserrat', fontWeight: 700,
            fontSize: STYLE.fontSize * S, lineHeight: 1.25, color: STYLE.color, textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}>
            {text}
          </div>
        </div>
      </div>
    ),
    { width: W * S, height: H * S, fonts: [{ name: 'Montserrat', data: font, weight: 700, style: 'normal' }] },
  );
  return sharp(Buffer.from(await res.arrayBuffer())).jpeg({ quality: 80 }).toBuffer();
}

/** One shot's full Auto Fit (fitted height and the frame's regions), or null (the shot keeps its position). */
async function fitShot(shot: DeckShot, font: ArrayBuffer, known?: BackgroundRegions): Promise<{ y: number; regions: BackgroundRegions | null } | null> {
  const text = shot.text.trim();
  if (!text) return null;
  const t0 = Date.now();
  const bg = await backgroundJpeg(shot);
  if (!bg) return null;
  const startY = shot.positionY ?? STYLE.positionY;
  const t1 = Date.now();
  const composite = await compositeJpeg(bg, text, startY, font);
  const t2 = Date.now();
  const fit = await autoFitCaption({
    backgroundJpeg: `data:image/jpeg;base64,${bg.toString('base64')}`,
    compositeJpeg: `data:image/jpeg;base64,${composite.toString('base64')}`,
    captionText: text,
    layout: { caption: captionRect(text, startY), business: null },
  }, known, { parallel: true });
  if (Date.now() - t0 > SLOW_SHOT_MS) {
    console.log(`[caption-fit] slow shot ${Math.round((Date.now() - t0) / 100) / 10}s: frame ${t1 - t0}ms, draw ${t2 - t1}ms, models ${Date.now() - t2}ms${known ? ' (heads known)' : ''} — ${shot.assetKey}`);
  }
  return fit ? { y: fit.captionPositionY, regions: fit.regions } : null;
}

/** Off the frame's heads by geometry alone (no model call): the nearest clear height to where the caption starts. */
function geometricY(shot: DeckShot, regions: BackgroundRegions): number {
  const startY = shot.positionY ?? STYLE.positionY;
  const { bottom } = clearOfHeads(startY * H, captionRect(shot.text.trim(), startY), regions.faces);
  return Number((bottom / H).toFixed(4));
}

/** Runs `jobs` with at most `limit` in flight. */
async function pool<T>(jobs: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const out: T[] = new Array(jobs.length);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const i = next++;
      out[i] = await jobs[i]!();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, worker));
  return out;
}

const shotKey = (s: DeckShot) => `${s.assetKey ?? ''}|${s.trimStart ?? 0}|${s.text.trim()}`;

/** Fits running in this process, by asset and fit key: a second call for the same shot waits for the first. */
const inFlight = new Map<string, Promise<{ y: number } | null>>();

/** One shot's Auto Fit, saved when it lands (shared with any call already fitting it). */
function fitOnce(shot: DeckShot, font: ArrayBuffer, known?: BackgroundRegions): Promise<{ y: number } | null> {
  const key = `${shot.assetId ?? shot.assetKey}|${cacheKeyOf(shot)}`;
  const running = inFlight.get(key);
  if (running) return running;
  const fitting = fitShot(shot, font, known).catch(fitFailed).then(async (fit) => {
    if (fit && shot.assetId) await saveFit(shot.assetId, shot.trimStart ?? 0, cacheKeyOf(shot), fit.y, fit.regions);
    return fit;
  }).finally(() => inFlight.delete(key));
  inFlight.set(key, fitting);
  return fitting;
}

/** What saved data gives a shot now: its fitted height, else a height off its frame's known heads, else nothing. */
function fromCache(shot: DeckShot, saved: Map<string, SavedFits>): { y: number | null; fitted: boolean; regions?: BackgroundRegions } {
  const s = shot.assetId ? saved.get(shot.assetId) : undefined;
  const fit = s?.fits[cacheKeyOf(shot)];
  const regions = s?.regions[regionsKey(shot.trimStart ?? 0)];
  if (typeof fit === 'number') return { y: fit, fitted: true, regions };
  return { y: regions ? geometricY(shot, regions) : null, fitted: false, regions };
}

const fitFailed = (err: unknown) => {
  console.warn('[caption-fit] shot failed:', err instanceof Error ? err.message.split('\n')[0] : err);
  return null;
};

/**
 * Caption heights for `shots` (same order); null where a shot has none (it keeps its position). Shots with the same
 * clip and line are placed once. `models: false` uses saved data only (instant: fits, then geometry off known heads);
 * `true` runs the full Auto Fit on every shot without a saved fit, and saves it. `deadlineMs`: stop waiting for slow
 * shots (they keep their saved-data height; their fit still lands in the cache). Never throws.
 */
export async function fitShotCaptions(shots: DeckShot[], opts: { models?: boolean; deadlineMs?: number } = {}): Promise<Array<number | null>> {
  const models = opts.models ?? true;
  const font = models ? await loadFont() : null;
  if (models && !font) {
    console.warn('[caption-fit] Montserrat did not load; captions keep their positions');
    return shots.map(() => null);
  }
  const unique = new Map<string, DeckShot>();
  for (const shot of shots) if (shot.assetKey && shot.text.trim()) unique.set(shotKey(shot), shot);
  const keys = [...unique.keys()];
  const started = Date.now();
  const saved = await loadFits([...new Set([...unique.values()].flatMap((s) => (s.assetId ? [s.assetId] : [])))]);
  const now = keys.map((k) => fromCache(unique.get(k)!, saved));
  const fitted = await pool(keys.map((k, i) => async () => {
    const shot = unique.get(k)!;
    const known = now[i]!;
    if (known.fitted || !models) return known.y;
    const fitting = fitOnce(shot, font!, known.regions);
    if (!opts.deadlineMs) return (await fitting)?.y ?? known.y;
    // A shot slower than the deadline keeps its place for now; its fit is still saved when it lands, and a later call
    // for the same shot waits for this one instead of fitting again.
    const fit = await Promise.race([fitting, new Promise<null>((resolve) => setTimeout(() => resolve(null), opts.deadlineMs))]);
    return fit?.y ?? known.y;
  }), CONCURRENCY);
  const byKey = new Map(keys.map((k, i) => [k, fitted[i]] as const));
  const hits = now.filter((c) => c.fitted).length;
  const geometry = now.filter((c) => !c.fitted && c.y != null).length;
  console.log(`[caption-fit] ${models ? 'Auto Fit' : 'saved only'}: ${fitted.filter((y) => y != null).length}/${keys.length} shots placed (${hits} saved fits, ${geometry} by known heads) in ${Date.now() - started} ms`);
  return shots.map((s) => byKey.get(shotKey(s)) ?? null);
}

/** The shot's fit-cache key: its frame and caption box (captionFitCache.ts). */
const cacheKeyOf = (s: DeckShot) => fitCacheKey(s.trimStart ?? 0, captionRect(s.text.trim(), STYLE.positionY), STYLE.fontSize * 1.25);

/**
 * Places the caption of every shot of `cards`, in place of the text-safe-zone guess. Story shots shared by a brief's
 * cards (same clip, same line) are placed once. `models`: see fitShotCaptions. Never throws: a shot without a height
 * keeps its zone position.
 */
export async function fitDeckCaptions(cards: DeckItem[], opts: { models?: boolean } = {}): Promise<DeckItem[]> {
  const ys = await fitShotCaptions(cards.flatMap((c) => c.shots), opts);
  let n = 0;
  return cards.map((c) => ({
    ...c,
    shots: c.shots.map((s) => {
      const y = ys[n++];
      return y == null ? s : { ...s, positionY: y };
    }),
  }));
}
