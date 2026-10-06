// Your Brand Content: photos the user uploads to their workspace, kept to reuse in slideshows later.
// Shared by the server (src/server/brandContent/brandPhotos.ts) and the browser.

/** `description`: written by a vision model in the background after upload; null until then (or when it failed). */
export type BrandPhotoDto = { id: string; url: string | null; filename: string; description: string | null; createdAt: string };

export type BrandPhotosDto = { photos: BrandPhotoDto[] };

/** Photos in one workspace at most, so the list stays one fast page. */
export const MAX_BRAND_PHOTOS = 200;
