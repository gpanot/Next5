import type { MetadataRoute } from 'next';

const PRIVATE_PATHS = ['/app', '/admin', '/api', '/start', '/dev', '/studio'];

/** Link preview bots may read /p/ pack links to build their share card; the pages stay noindex via their layout. */
const PREVIEW_BOTS = ['Twitterbot', 'facebookexternalhit', 'LinkedInBot', 'Slackbot-LinkExpanding', 'Discordbot', 'TelegramBot', 'WhatsApp'];

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: [...PRIVATE_PATHS, '/p/'] },
      { userAgent: PREVIEW_BOTS, allow: '/', disallow: PRIVATE_PATHS },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
