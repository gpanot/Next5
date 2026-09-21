/** TikTok link helpers for the marketing UGC wall. Server-side only (oEmbed fetch). */

export type TikTokVideo = {
  id: string;
  url: string;
  label: string;
  /** TikTok handle, without the @. */
  author: string | null;
  thumbnail: string | null;
};

const ID_IN_URL = /\/video\/(\d{8,})/;
const ID_IN_HTML = /data-video-id="(\d{8,})"/;

/** The numeric video id from a full TikTok link, or null for short links. */
export const tiktokIdFromUrl = (url: string): string | null => url.match(ID_IN_URL)?.[1] ?? null;

/** TikTok's own embeddable player (no page chrome). */
export const tiktokPlayerUrl = (id: string): string =>
  `https://www.tiktok.com/player/v1/${id}?autoplay=1&loop=1&music_info=0&description=0&rel=0&native_context_menu=0`;

type OEmbed = { author_url?: string; thumbnail_url?: string; html?: string; embed_product_id?: string };

const fetchOEmbed = async (url: string): Promise<OEmbed | null> => {
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, { next: { revalidate: 60 * 60 * 6 } });
    return res.ok ? ((await res.json()) as OEmbed) : null;
  } catch {
    return null;
  }
};

/**
 * Resolves one link to an id, cover and author. Covers are signed CDN links that expire,
 * so the fetch revalidates every 6 hours. Returns null when no id can be found.
 */
export const resolveTikTok = async (url: string, label: string): Promise<TikTokVideo | null> => {
  const meta = await fetchOEmbed(url);
  const id = tiktokIdFromUrl(url) ?? meta?.embed_product_id ?? meta?.html?.match(ID_IN_HTML)?.[1] ?? null;
  if (!id) return null;
  return { id, url, label, author: meta?.author_url?.match(/@([\w.]+)/)?.[1] ?? null, thumbnail: meta?.thumbnail_url ?? null };
};

export const resolveTikToks = async (clips: readonly { url: string; label: string }[]): Promise<TikTokVideo[]> =>
  (await Promise.all(clips.map((c) => resolveTikTok(c.url, c.label)))).filter((v): v is TikTokVideo => v !== null);
