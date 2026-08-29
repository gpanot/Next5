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
 * Downloads a single remote image as `filename`.
 *
 * Photos are served from R2 or the generation CDN, both cross-origin — a plain
 * `<a download>` is silently ignored by browsers for cross-origin hrefs, so we
 * fetch the bytes ourselves and save them as a blob. If the host doesn't send
 * CORS headers the fetch fails; we fall back to opening the image in a new tab
 * so she can still save it manually.
 */
export const downloadFile = async (url: string, filename: string): Promise<void> => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    saveBlob(await res.blob(), filename);
  } catch (err) {
    console.warn('[download] Falling back to opening in a new tab:', err);
    window.open(url, '_blank', 'noopener,noreferrer');
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
