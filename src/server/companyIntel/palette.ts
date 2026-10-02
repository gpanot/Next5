// server-only — never import from a 'use client' file.
// Brand palette, favicon and share image read from the site's own HTML and CSS: theme-color, inline <style>, style=""
// attributes and linked stylesheets. Nothing is guessed — a site with no usable colors gets an empty palette.

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const MAX_STYLESHEETS = 5;
const MAX_CSS_BYTES = 600_000;
const PALETTE_SIZE = 3;

type Rgb = [number, number, number];

const fetchText = async (url: string): Promise<string> => {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10_000) });
    return res.ok ? (await res.text()).slice(0, MAX_CSS_BYTES) : '';
  } catch {
    return '';
  }
};

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const toHex = ([r, g, b]: Rgb) => `#${[r, g, b].map((c) => clamp(c).toString(16).padStart(2, '0')).join('')}`;

const parseHex = (hex: string): Rgb => {
  const h = hex.length === 4 ? [...hex.slice(1)].map((c) => c + c).join('') : hex.slice(1, 7);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
};

const parseRgb = (args: string): Rgb | null => {
  const n = args.split(/[\s,/]+/).filter(Boolean).slice(0, 3).map(Number);
  return n.length === 3 && n.every(Number.isFinite) ? (n as Rgb) : null;
};

const parseHsl = (args: string): Rgb | null => {
  const [h, s, l] = args.split(/[\s,/]+/).filter(Boolean).slice(0, 3).map((v) => parseFloat(v));
  if (![h, s, l].every(Number.isFinite)) return null;
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (k: number) => {
    const x = (k + h / 30) % 12;
    return 255 * (l / 100 - a * Math.max(-1, Math.min(x - 3, 9 - x, 1)));
  };
  return [f(0), f(8), f(4)];
};

/** oklch → sRGB (Tailwind v4 sites write their colors this way). */
const parseOklch = (args: string): Rgb | null => {
  const [lRaw, cRaw, hRaw] = args.split(/[\s,/]+/).filter(Boolean);
  const L = lRaw?.endsWith('%') ? parseFloat(lRaw) / 100 : parseFloat(lRaw ?? '');
  const C = parseFloat(cRaw ?? '');
  const H = (parseFloat(hRaw ?? '') * Math.PI) / 180;
  if (![L, C, H].every(Number.isFinite)) return null;
  const [A, B] = [C * Math.cos(H), C * Math.sin(H)];
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return lin.map((c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)) as Rgb;
};

const COLOR_RE = /(--[\w-]+\s*:\s*)?(#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|rgba?\(([^)]*)\)|hsla?\(([^)]*)\)|oklch\(([^)]*)\))/gi;
const BRAND_VAR_RE = /--[\w-]*(brand|primary|accent|main|theme)[\w-]*/i;
/** Alert and form-state colors of a design system (Porsche's blue info, red error, green success): never the brand. */
const STATUS_DECL_RE = /--[\w-]*(info|success|error|warn|danger|notification|positive|negative|critical|alert|valid|invalid|disabled|focus)[\w-]*\s*:[^;}]*/gi;

const parseColor = (match: RegExpExecArray): Rgb | null => {
  const token = match[2].toLowerCase();
  if (token.startsWith('#')) return parseHex(token);
  if (token.startsWith('rgb')) return parseRgb(match[3] ?? '');
  if (token.startsWith('hsl')) return parseHsl(match[4] ?? '');
  return parseOklch(match[5] ?? '');
};

const saturation = ([r, g, b]: Rgb) => (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
const distance = (a: Rgb, b: Rgb) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Counts every color in the CSS; brand-named custom properties count 10×, each theme-color 20×, status colors 0. */
const scoreColors = (css: string, themeColors: string[]): Map<string, number> => {
  const scores = new Map<string, number>();
  const add = (rgb: Rgb, weight: number) => {
    const hex = toHex(rgb);
    scores.set(hex, (scores.get(hex) ?? 0) + weight);
  };
  const brandCss = css.replace(STATUS_DECL_RE, '');
  COLOR_RE.lastIndex = 0;
  for (const color of themeColors) if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color)) add(parseHex(color.toLowerCase()), 20);
  for (let m = COLOR_RE.exec(brandCss); m; m = COLOR_RE.exec(brandCss)) {
    const rgb = parseColor(m);
    if (rgb) add(rgb, m[1] && BRAND_VAR_RE.test(m[1]) ? 10 : 1);
  }
  return scores;
};

/** A strong color this much rarer than the site's most used color is decoration, not brand. */
const MIN_BRAND_SHARE = 0.1;

/**
 * Brand colors first (saturated and used often enough), then the most used colors of any kind, black and white included,
 * to fill 3 swatches. A black-and-white brand (Porsche, Chanel) gets its black and white, not a rare accent.
 */
export const pickPalette = (scores: Map<string, number>): string[] => {
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([hex, score]) => ({ hex, score, rgb: parseHex(hex) }));
  const top = ranked[0]?.score ?? 0;
  const picked: typeof ranked = [];
  const take = (keep: (c: (typeof ranked)[number]) => boolean) => {
    for (const c of ranked) {
      if (picked.length >= PALETTE_SIZE) return;
      if (keep(c) && picked.every((p) => distance(p.rgb, c.rgb) > 40)) picked.push(c);
    }
  };
  take((c) => saturation(c.rgb) > 0.25 && c.score >= top * MIN_BRAND_SHARE);
  take(() => true);
  return picked.map((c) => c.hex);
};

const findFavicon = (html: string, siteUrl: string): string | null => {
  const tag = [...html.matchAll(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/gi)].map((m) => m[0]).sort((a, b) => Number(b.includes('apple')) - Number(a.includes('apple')))[0];
  const href = tag?.match(/href=["']([^"']+)/i)?.[1];
  return href ? new URL(href.replace(/&amp;/g, '&'), siteUrl).toString() : null;
};

/** Sites without an icon <link> usually still serve /favicon.ico. */
const defaultFavicon = async (siteUrl: string): Promise<string | null> => {
  const url = new URL('/favicon.ico', siteUrl).toString();
  try {
    const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5_000) });
    return res.ok && (res.headers.get('content-type') ?? '').startsWith('image') ? url : null;
  } catch {
    return null;
  }
};

const metaContent = (tag: string): string | null => tag.match(/content=["']?([^"'\s>]+)/i)?.[1] ?? null;

/** Every theme-color (light and dark), quoted or not: Porsche writes <meta name=theme-color content=#FFF>. */
const findThemeColors = (html: string): string[] =>
  [...html.matchAll(/<meta[^>]+name=["']?theme-color["']?[^>]*>/gi)].map((m) => metaContent(m[0])).filter((c): c is string => Boolean(c));

/** The share image (og:image, else twitter:image); sites write it as property= or name=, in either attribute order. */
export const findShareImage = (html: string, siteUrl: string): string | null => {
  const tags = [...html.matchAll(/<meta[^>]+>/gi)].map((m) => m[0]);
  for (const key of ['og:image', 'og:image:url', 'og:image:secure_url', 'twitter:image']) {
    const tag = tags.find((t) => new RegExp(`(property|name)=["']?${key}["'\\s>]`, 'i').test(t));
    const content = tag && metaContent(tag);
    if (content) {
      try {
        return new URL(content.replace(/&amp;/g, '&'), siteUrl).toString();
      } catch {
        // A broken URL is the same as none.
      }
    }
  }
  return null;
};

export type SiteStyle = { palette: string[]; faviconUrl: string | null; shareImageUrl: string | null };

/** Palette, favicon and share image from the site's own HTML and CSS. */
export const readSiteStyle = async (siteUrl: string): Promise<SiteStyle> => {
  const html = await fetchText(siteUrl);
  if (!html) return { palette: [], faviconUrl: null, shareImageUrl: null };
  const inline = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi), ...html.matchAll(/style=["']([^"']+)["']/gi)].map((m) => m[1]);
  const hrefs = [...html.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi)]
    .map((m) => m[0].match(/href=["']([^"']+)/i)?.[1])
    .filter((href): href is string => Boolean(href))
    .slice(0, MAX_STYLESHEETS)
    .map((href) => new URL(href, siteUrl).toString());
  const sheets = await Promise.all(hrefs.map(fetchText));
  const faviconUrl = findFavicon(html, siteUrl) ?? (await defaultFavicon(siteUrl));
  const palette = pickPalette(scoreColors([...inline, ...sheets].join('\n'), findThemeColors(html)));
  return { palette, faviconUrl, shareImageUrl: findShareImage(html, siteUrl) };
};
