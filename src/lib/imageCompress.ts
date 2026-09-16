'use client';

/**
 * Shrinks a photo in the browser before it is uploaded.
 *
 * Why: a Vercel Function accepts at most 4.5 MB per request, and phone photos are 3–12 MB each.
 * Quality is not lost: the server stores every upload at the same 2048 px / JPEG 90 anyway
 * (`normalizeUpload`), so this only moves that step to the phone and keeps uploads small and fast.
 * Photos the browser can't decode (some HEIC files) are sent as they are — the server handles them.
 */

/** Longest side kept, the same as the server stores. */
export const MAX_SIDE = 2048;
/** Target for one photo; quality steps down until it fits. */
export const TARGET_BYTES = 2 * 1024 * 1024;
/** Smallest photo the server accepts (`normalizeUpload`). */
export const MIN_SIDE = 400;

/** Photos already small and not oversized are sent untouched. */
const SKIP_BYTES = 1.5 * 1024 * 1024;
const QUALITY_STEPS = [0.92, 0.86, 0.8];

const canCompress = (): boolean => typeof window !== 'undefined' && typeof createImageBitmap === 'function' && typeof document !== 'undefined';

const toBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

const jpegName = (name: string): string => `${name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`;

/**
 * Returns a JPEG no larger than MAX_SIDE on its longest side, aiming for TARGET_BYTES.
 * Returns the original file when it is already small enough or can't be read here.
 */
export const compressImage = async (file: File): Promise<File> => {
  if (!canCompress() || !file.type.startsWith('image/')) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // e.g. HEIC on a browser that can't decode it
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= SKIP_BYTES) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let smallest: Blob | null = null;
  for (const quality of QUALITY_STEPS) {
    const blob = await toBlob(canvas, quality);
    if (!blob) break;
    smallest = blob;
    if (blob.size <= TARGET_BYTES) break;
  }
  if (!smallest || smallest.size >= file.size) return file;
  return new File([smallest], jpegName(file.name), { type: 'image/jpeg', lastModified: file.lastModified });
};

export const compressImages = (files: readonly File[]): Promise<File[]> => Promise.all(files.map(compressImage));

/** Width and height of a photo, or null when the browser can't read it (the server then decides). */
export const readSize = async (file: File): Promise<{ width: number; height: number } | null> => {
  if (!canCompress()) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
};

/** The reason this photo can't be used, in plain words — or null when it is fine. */
export const photoProblem = (size: { width: number; height: number } | null): string | null =>
  size && (size.width < MIN_SIDE || size.height < MIN_SIDE)
    ? `This photo is too small (${size.width} × ${size.height}). Use one at least ${MIN_SIDE} px wide and tall.`
    : null;

/**
 * Splits photos into upload requests that stay under the 4.5 MB limit
 * (`maxBytes` leaves room for the other form fields).
 */
export const chunkBySize = <T>(items: readonly T[], sizeOf: (item: T) => number, maxBytes = 3.5 * 1024 * 1024, maxItems = 6): T[][] => {
  const chunks: T[][] = [];
  let current: T[] = [];
  let bytes = 0;
  for (const item of items) {
    const size = sizeOf(item);
    if (current.length > 0 && (bytes + size > maxBytes || current.length >= maxItems)) {
      chunks.push(current);
      current = [];
      bytes = 0;
    }
    current.push(item);
    bytes += size;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
};
