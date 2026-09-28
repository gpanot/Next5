// Text helpers for ad copy, which is full of emoji. An emoji is two UTF-16 code units; cutting between them leaves a
// lone surrogate, which OpenAI rejects as invalid JSON and Postgres JSONB refuses to store.

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/** Removes any lone surrogate, so the string is valid Unicode everywhere. */
export const wellFormed = (text: string): string => text.replace(LONE_SURROGATE, '');

/** `text.slice(0, max)` that never cuts an emoji in half. */
export const clip = (text: string, max: number): string => wellFormed(text.length > max ? text.slice(0, max) : text);
