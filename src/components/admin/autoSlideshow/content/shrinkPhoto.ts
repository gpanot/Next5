'use client';

/** Longest side sent to the server, the same it stores (src/server/brandContent/compressPhoto.ts). */
const MAX_SIDE = 1920;
/** Hosting refuses bodies over ~4.5 MB: a photo the browser can't shrink must already fit. */
export const MAX_RAW_BYTES = 4 * 1024 * 1024;

const jpegName = (name: string) => `${name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`;

/**
 * Phone photos are often 3-12 MB: re-encoded here as a 1920 px JPEG (under ~1 MB) so the upload is fast on a phone
 * network and fits. High quality, since the server compresses it once more to ~600 KB. A file the browser can't read
 * (HEIC outside Safari) goes as it is, and the server converts it.
 */
export async function shrinkPhoto(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    return blob ? new File([blob], jpegName(file.name), { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}
