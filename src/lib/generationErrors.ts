// Client-safe: shared by the generation pipeline and the photo tiles.

/** True when the image model refused the photo on safety grounds — retrying the same model won't help. */
export const isContentFlagged = (message: string | null | undefined): boolean =>
  Boolean(message && /flagged|sensitive|safety|moderation|content policy|nsfw/i.test(message));

/** Short, plain words for a failed photo. */
export const failedPhotoText = (message: string | null, canRetry: boolean): string => {
  if (isContentFlagged(message)) {
    return canRetry
      ? 'The AI safety filter blocked this photo. This happens with lingerie and swimwear. Try again with our second AI model.'
      : 'The safety filter blocked this photo again. Try a different product photo.';
  }
  return canRetry ? 'This photo didn’t work. Try again for free.' : 'This photo didn’t work twice. Try a different product photo.';
};
