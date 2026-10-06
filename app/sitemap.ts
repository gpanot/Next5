import type { MetadataRoute } from 'next';
import { isBusinessEnabled } from '../src/config/business';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const consumer = ['/', '/pricing', '/privacy', '/terms', '/photos'];
  const business = isBusinessEnabled() ? ['/TTZillow', '/TTZillow/pricing', '/brand', '/shop', '/legal/terms', '/legal/privacy', '/legal/ai-and-face-data'] : [];
  return [...consumer, ...business].map((path) => ({ url: `${base}${path}`, changeFrequency: 'weekly', priority: path === '/' ? 1 : 0.7 }));
}
