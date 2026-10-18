import { PRICE_CENTS } from '../pricing/pricing';
import { SOCIAL_LINKS } from './siteLinks';

/** Organization + WebSite + SoftwareApplication structured data for the home page, so search engines know who Next5 is, who it serves and where its socials live. */
export function HomeJsonLd() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const organization = {
    '@type': 'Organization',
    '@id': `${base}/#organization`,
    name: 'Next5',
    url: `${base}/`,
    logo: `${base}/icon.svg`,
    sameAs: SOCIAL_LINKS.map(({ href }) => href),
  };
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      { '@type': 'WebSite', '@id': `${base}/#website`, name: 'Next5', url: `${base}/`, inLanguage: 'en-US', publisher: { '@id': organization['@id'] } },
      {
        '@type': 'SoftwareApplication',
        name: 'Next5 Auto Slideshow',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: `${base}/`,
        description: 'Done-for-you TikTok and Instagram content for small businesses. Paste your website and get slideshows and short videos with hooks, captions and hashtags, built on formats that already get views.',
        audience: { '@type': 'BusinessAudience', audienceType: 'Small and medium-sized businesses' },
        areaServed: 'US',
        offers: { '@type': 'Offer', price: (PRICE_CENTS / 100).toFixed(2), priceCurrency: 'USD', description: 'Per slideshow or video. Pay as you go, no subscription.' },
        publisher: { '@id': organization['@id'] },
      },
    ],
  };
  const html = JSON.stringify(jsonLd).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: html }} />;
}
