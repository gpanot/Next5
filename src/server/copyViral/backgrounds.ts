// server-only — never import from a 'use client' file.
// The picture behind Guillaume for a green-screen sequence: generated from Gemini's description (Nano Banana 2 Lite,
// $0.015)
// or his own upload. The engine cuts him out over it (Apple Vision matte), so he can film in any room.

import { createWriteStream } from 'fs';
import { copyFile, mkdir, rm, writeFile } from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import type { ReadableStream as WebReadableStream } from 'stream/web';
import { generateVerticalImage, ImageGenerationError } from '../ai/imageGeneration';
import { HttpError } from '../http';
import type { CopyViralShot } from '../../types/admin/copyViral';
import { getProject, mutateProject, projectFile } from './store';

const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** Bright and real (never "cinematic": it made the photos dark), empty in the middle where the person stands. */
export const backgroundPrompt = (description: string) =>
  `Vertical 9:16 real photo, used as the background behind a person talking to camera (they are added later, in the center). ` +
  `${description}. Eye level, bright natural light, sharp, realistic, no people, no text, no logos, nothing in the center foreground.`;

const findShot = (shots: CopyViralShot[], index: number, startMs: number) => {
  const shot = shots[index];
  if (!shot || shot.startMs !== startMs) throw new HttpError(409, 'shots_changed', 'The shots changed: reload the page');
  return shot;
};

/**
 * Points every shot of the shot's sequence (one picture scene) at `file` (and the text it was made from, when given);
 * deletes pictures no shot uses any more.
 */
const setBackground = async (id: string, index: number, startMs: number, file: string | null, text?: string) => {
  let olds: string[] = [];
  const project = await mutateProject(id, (p) => {
    const seq = findShot(p.shots, index, startMs).sequence;
    olds = p.shots.filter((s) => s.sequence === seq && s.background).map((s) => s.background as string);
    return { ...p, shots: p.shots.map((s) => (s.sequence === seq ? { ...s, background: file, ...(text !== undefined ? { backgroundText: text } : {}) } : s)) };
  }).catch(async (err: unknown) => {
    if (file) await rm(projectFile(id, file), { force: true });
    throw err;
  });
  const used = new Set(project.shots.map((s) => s.background));
  await Promise.all([...new Set(olds)].filter((f) => !used.has(f)).map((f) => rm(projectFile(id, f), { force: true })));
  return project;
};

const newFile = async (id: string, index: number, ext: string) => {
  await mkdir(projectFile(id, 'backgrounds'), { recursive: true });
  return `backgrounds/shot-${index + 1}-${Date.now()}.${ext}`;
};

export const generateBackground = async (id: string, index: number, startMs: number, description?: string) => {
  const shot = findShot((await getProject(id)).shots, index, startMs);
  const text = description?.trim() || shot.reading?.background || '';
  if (!text) throw new HttpError(400, 'no_description', 'Describe the background first');
  const image = await generateVerticalImage(backgroundPrompt(text), 'reapi-nano-banana-2-lite').catch((err: unknown) => {
    throw err instanceof ImageGenerationError ? new HttpError(502, 'image_failed', err.message) : err;
  });
  const file = await newFile(id, index, image.ext);
  await writeFile(projectFile(id, file), image.buffer);
  return setBackground(id, index, startMs, file, text);
};

export const uploadBackground = async (id: string, index: number, startMs: number, contentType: string, body: ReadableStream<Uint8Array>) => {
  const ext = IMAGE_TYPES[contentType];
  if (!ext) throw new HttpError(400, 'not_an_image', 'Upload a JPG, PNG or WebP image');
  const file = await newFile(id, index, ext);
  await pipeline(Readable.fromWeb(body as WebReadableStream<Uint8Array>), createWriteStream(projectFile(id, file)));
  return setBackground(id, index, startMs, file);
};

/** The picture of the sequence before (the same place again). */
export const copyPreviousBackground = async (id: string, index: number, startMs: number) => {
  const shots = (await getProject(id)).shots;
  const seq = findShot(shots, index, startMs).sequence;
  const from = [...shots].reverse().find((s) => s.sequence < seq && s.background)?.background;
  if (!from) throw new HttpError(409, 'no_previous', 'No sequence before has a picture');
  const file = await newFile(id, index, path.extname(from).slice(1));
  await copyFile(projectFile(id, from), projectFile(id, file));
  return setBackground(id, index, startMs, file);
};

export const removeBackground = (id: string, index: number, startMs: number) => setBackground(id, index, startMs, null);
