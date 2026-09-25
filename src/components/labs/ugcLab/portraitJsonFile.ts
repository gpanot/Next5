'use client';

/** Pretty-printed JSON, the same text for copy and download. */
export const portraitJsonText = (json: Record<string, unknown>): string => JSON.stringify(json, null, 2);

/** Saves the Portrait Clone JSON as a .json file. */
export const downloadPortraitJson = (json: Record<string, unknown>, characterId: string): void => {
  const blob = new Blob([portraitJsonText(json)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `character-${characterId.slice(-8)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/** Copies the Portrait Clone JSON to the clipboard. Resolves false when the browser blocks it. */
export const copyPortraitJson = async (json: Record<string, unknown>): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(portraitJsonText(json));
    return true;
  } catch {
    return false;
  }
};
