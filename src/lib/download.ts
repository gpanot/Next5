import JSZip from 'jszip';

/**
 * Triggers a browser save for `blob` under `filename` via a throwaway anchor.
 * Object URLs are revoked on a delay — revoking synchronously can cancel the
 * download in some browsers before it starts.
 */
const saveBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Fetches `url` and returns it as a Blob.
 * Falls back to null if CORS blocks the fetch.
 */
const fetchBlob = async (url: string): Promise<Blob | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return await res.blob();
  } catch (err) {
    console.warn('[download] Could not fetch image blob:', err);
    return null;
  }
};

/**
 * Draws `imageBlob` onto a canvas and burns the NEXT5 watermark into the
 * bottom-left corner, then resolves with the composited JPEG blob.
 */
const burnWatermark = (imageBlob: Blob): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('No 2D context')); return; }

      ctx.drawImage(img, 0, 0);

      const fontSize = Math.round(img.naturalWidth * 0.032 * 0.6);
      ctx.font = `${fontSize}px serif`;
      ctx.letterSpacing = `${fontSize * 0.22}px`;
      ctx.fillStyle = 'rgba(255,255,255,0.70)';
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 1;
      const margin = Math.round(img.naturalWidth * 0.035);
      ctx.fillText('NEXT5', margin, img.naturalHeight - margin);

      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('canvas.toBlob returned null')),
        'image/jpeg',
        0.92,
      );
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = URL.createObjectURL(imageBlob);
  });

/**
 * Downloads a single remote image with the NEXT5 watermark burned in.
 *
 * Photos are served cross-origin (R2 / generation CDN) — a plain
 * `<a download>` is silently ignored by browsers for cross-origin hrefs, so we
 * fetch the bytes ourselves, composite the watermark on a canvas, and save the
 * result. Falls back to opening the raw image in a new tab if CORS blocks us.
 */
export const downloadFile = async (url: string, filename: string): Promise<void> => {
  const blob = await fetchBlob(url);
  if (!blob) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  try {
    const watermarked = await burnWatermark(blob);
    saveBlob(watermarked, filename.replace(/\.\w+$/, '.jpg'));
  } catch (err) {
    console.warn('[download] Watermark compositing failed, saving original:', err);
    saveBlob(blob, filename);
  }
};

/**
 * Bundles every photo into a single .zip and downloads it. Files that fail to
 * fetch are skipped rather than failing the whole bundle — she still gets
 * everything that worked.
 */
export const downloadAllAsZip = async (
  files: readonly { url: string; filename: string }[],
  zipName: string,
): Promise<{ succeeded: number; failed: number }> => {
  const zip = new JSZip();
  let succeeded = 0;
  let failed = 0;

  await Promise.all(
    files.map(async ({ url, filename }) => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        zip.file(filename, await res.arrayBuffer());
        succeeded += 1;
      } catch (err) {
        console.warn(`[download] Skipping ${filename} in zip:`, err);
        failed += 1;
      }
    }),
  );

  if (succeeded > 0) {
    saveBlob(await zip.generateAsync({ type: 'blob' }), zipName);
  }

  return { succeeded, failed };
};
