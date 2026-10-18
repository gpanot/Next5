/** Heading text to a URL fragment id ("What to post?" -> "what-to-post"). */
export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/\*\*/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
