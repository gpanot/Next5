// server-only — never import from a 'use client' file.

import sharp from 'sharp';
import { getObject } from '../storage/objectStore';

/** A small JPEG data URL of a stored image, for low-detail vision calls (keeps tokens and cost low). */
export const imageDataUrl = async (key: string, width = 512): Promise<string | null> => {
  const buffer = await getObject(key);
  if (!buffer) return null;
  const jpeg = await sharp(buffer).resize({ width, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
};
