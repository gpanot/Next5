/**
 * Campaign Studio — internal links from a site's raw homepage HTML.
 *
 * Exa's text extraction drops navigation, and navigation is often where a business says who it
 * serves ("Industries → Mechanics, Electricians" on avenue2.au). Server-rendered HTML still
 * carries those links, so we read them directly: one plain fetch, no paid API.
 */
// server-only

export type SiteLink = { url: string; label: string };

const MAX_LINKS = 60;

/** Paths that never describe the business or its customers. */
const JUNK_PATH = /\.(pdf|jpe?g|png|gif|webp|svg|mp4|zip|xml|css|js)$|\/(wp-admin|wp-content|cart|checkout|login|log-in|signin|sign-in|signup|sign-up|register|account|privacy|terms|cookie|legal|sitemap|feed|tag|author)(\/|$)/i;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function labelOf(innerHtml: string, tag: string): string {
  const text = decodeEntities(innerHtml.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
  if (text) return text.slice(0, 60);
  // Icon-only links: fall back to aria-label / title on the <a> tag itself.
  const attr = tag.match(/\b(?:aria-label|title)="([^"]+)"/i);
  return attr ? decodeEntities(attr[1]!).trim().slice(0, 60) : '';
}

const bareHost = (h: string) => h.toLowerCase().replace(/^www\./, '');

/** Resolve an href against the site; null unless it is a same-site, non-junk, non-homepage page. */
function toSitePage(href: string, base: URL): { url: string; path: string } | null {
  if (/^(#|mailto:|tel:|javascript:)/i.test(href)) return null;
  let url: URL;
  try {
    url = new URL(decodeEntities(href), base);
  } catch {
    return null;
  }
  if (bareHost(url.hostname) !== bareHost(base.hostname) || !/^https?:$/.test(url.protocol)) return null;
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (path === '/' || JUNK_PATH.test(path) || path.startsWith('/cdn-cgi/')) return null;
  return { url: `${url.origin}${path}`, path };
}

function parseBase(baseUrl: string): URL | null {
  try {
    return new URL(baseUrl);
  } catch {
    return null;
  }
}

/** Pure: same-site links with visible labels, deduped by path, homepage excluded. */
export function extractSiteLinks(html: string, baseUrl: string): SiteLink[] {
  const base = parseBase(baseUrl);
  if (!base) return [];

  const out: SiteLink[] = [];
  const seen = new Set<string>();
  const re = /(<a\b[^>]*>)([\s\S]*?)<\/a>/gi;

  for (let m = re.exec(html); m && out.length < MAX_LINKS; m = re.exec(html)) {
    const tag = m[1]!;
    const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    const page = href ? toSitePage(href, base) : null;
    if (!page || seen.has(page.path)) continue;

    const label = labelOf(m[2]!, tag);
    if (!label) continue;

    seen.add(page.path);
    out.push({ url: page.url, label });
  }
  return out;
}

/**
 * Pure: links from a bare href list (Exa `extras.links`, used when the site blocks our own
 * fetch). No anchor text there, so the label is the last path segment in words
 * ("/services/brake-repair-and-service" → "brake repair and service").
 */
export function linksFromHrefs(hrefs: string[], baseUrl: string): SiteLink[] {
  const base = parseBase(baseUrl);
  if (!base) return [];
  const out: SiteLink[] = [];
  const seen = new Set<string>();
  for (const href of hrefs) {
    const page = toSitePage(href, base);
    if (!page || seen.has(page.path)) continue;
    seen.add(page.path);
    const slug = page.path.split('/').filter(Boolean).pop() ?? '';
    let words = slug;
    try {
      words = decodeURIComponent(slug);
    } catch {
      // malformed %-escape: keep the raw slug
    }
    out.push({ url: page.url, label: words.replace(/[-_]+/g, ' ').trim() });
    if (out.length >= MAX_LINKS) break;
  }
  return out;
}

/** Fetch the homepage HTML and return its internal links. Empty on any failure (blocked, timeout). */
export async function fetchSiteLinks(sourceUrl: string): Promise<SiteLink[]> {
  const t0 = Date.now();
  try {
    const res = await fetch(sourceUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Next5StudioBot/1.0)', Accept: 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.warn(`[studio/site] homepage HTML HTTP ${res.status} — using Exa links instead`);
      return [];
    }
    const links = extractSiteLinks(await res.text(), res.url || sourceUrl);
    console.log(`[studio/site] ${links.length} internal links in ${Date.now() - t0}ms`);
    return links;
  } catch (err) {
    const reason = err instanceof Error ? ((err.cause as { code?: string } | undefined)?.code ?? err.message) : String(err);
    console.warn(`[studio/site] homepage HTML fetch failed (${reason}) — using Exa links instead`);
    return [];
  }
}
