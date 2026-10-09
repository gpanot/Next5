// server-only — never import from a 'use client' file.
// Caption Auto Fit for generated deck cards: the same vision check as the editor's Auto Fit button (blitzCaptionFit.ts),
// run on every shot before the cards are saved, so ideas start with the caption on a clear spot of their real picture.
// Per shot: the frame the video shows (photo, or the clip at its trim start) → the caption drawn on it in the Default
// style → Auto Fit. A shot that cannot be fitted keeps its text-safe-zone position.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { BLITZ_DEFAULT_TEXT_CONFIG, BLITZ_SLIDESHOW_TEXT_DEFAULTS } from '../../../config/blitzLab';
import { getObjectBuffer, getPresignedUrl } from '../../../lib/r2';
import { FFMPEG_PATH } from '../../admin/cloneUtils';
import { lineWidths } from '../../autoSlideshow/textPlacement';
import { autoFitCaption } from '../../labs/blitzCaptionFit';
import type { DeckItem, DeckShot } from './deckAssembly';

const execFileAsync = promisify(execFile);

const W = 1080;
const H = 1920;
/** Snapshots go to the model at half size, like the editor's. */
const S = 0.5;
/** Shots fitted at once: each is two model calls plus a frame grab. */
const CONCURRENCY = 10;
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

/** One shot's fitted caption position, or null (the shot keeps its text-safe-zone position). */
async function fitShot(shot: DeckShot, font: ArrayBuffer): Promise<number | null> {
  const text = shot.text.trim();
  if (!text) return null;
  const bg = await backgroundJpeg(shot);
  if (!bg) return null;
  const startY = shot.positionY ?? STYLE.positionY;
  const fit = await autoFitCaption({
    backgroundJpeg: `data:image/jpeg;base64,${bg.toString('base64')}`,
    compositeJpeg: `data:image/jpeg;base64,${(await compositeJpeg(bg, text, startY, font)).toString('base64')}`,
    captionText: text,
    layout: { caption: captionRect(text, startY), business: null },
  });
  return fit?.captionPositionY ?? null;
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

/**
 * Fitted caption heights for `shots` (same order), one attempt each; null where a shot cannot be fitted (it keeps its
 * position). Shots with the same clip and line are fitted once. Never throws.
 */
export async function fitShotCaptions(shots: DeckShot[]): Promise<Array<number | null>> {
  const font = await loadFont();
  if (!font) {
    console.warn('[caption-fit] Montserrat did not load; captions keep their positions');
    return shots.map(() => null);
  }
  const unique = new Map<string, DeckShot>();
  for (const shot of shots) if (shot.assetKey && shot.text.trim()) unique.set(shotKey(shot), shot);
  const keys = [...unique.keys()];
  const started = Date.now();
  const fitted = await pool(keys.map((k) => () => fitShot(unique.get(k)!, font).catch((err: unknown) => {
    console.warn('[caption-fit] shot failed:', err instanceof Error ? err.message.split('\n')[0] : err);
    return null;
  })), CONCURRENCY);
  const byKey = new Map(keys.map((k, i) => [k, fitted[i]] as const));
  console.log(`[caption-fit] ${fitted.filter((y) => y != null).length}/${keys.length} shots fitted in ${Date.now() - started} ms`);
  return shots.map((s) => byKey.get(shotKey(s)) ?? null);
}

/**
 * Fits the caption of every shot of `cards`, in place of the text-safe-zone guess. Story shots shared by a brief's
 * cards (same clip, same line) are fitted once. Never throws: a failed shot keeps its zone position.
 */
export async function fitDeckCaptions(cards: DeckItem[]): Promise<DeckItem[]> {
  const ys = await fitShotCaptions(cards.flatMap((c) => c.shots));
  let n = 0;
  return cards.map((c) => ({
    ...c,
    shots: c.shots.map((s) => {
      const y = ys[n++];
      return y == null ? s : { ...s, positionY: y };
    }),
  }));
}
