import type { MetadataRoute } from 'next';
import { ALL_ARTICLES, articleHref, GUIDES_HUB } from '../src/content/guides';
import { isBusinessEnabled } from '../src/config/business';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const consumer = ['/', '/pricing', GUIDES_HUB, '/privacy', '/terms'];
  const business = isBusinessEnabled() ? ['/TTZillow', '/TTZillow/pricing', '/brand', '/shop', '/legal/terms', '/legal/privacy', '/legal/ai-and-face-data'] : [];
  const pages: MetadataRoute.Sitemap = [...consumer, ...business].map((path) => ({ url: `${base}${path}`, changeFrequency: 'weekly', priority: path === '/' ? 1 : 0.7 }));
  const articles: MetadataRoute.Sitemap = ALL_ARTICLES.map((a) => ({ url: `${base}${articleHref(a)}`, lastModified: a.updated ?? a.published, changeFrequency: 'monthly', priority: 0.6 }));
  return [...pages, ...articles];
}
