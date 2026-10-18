import { articleHref, BLOG_ANCHOR, coverSrc, GUIDES_HUB } from '../../content/guides';
import type { Article } from '../../content/guides/types';
import { plainText } from './InlineText';

const siteUrl = (): string => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/** BlogPosting (or HowTo-style Article for guides) + BreadcrumbList + FAQPage, as one @graph. Escaped for a <script> tag. */
export function articleJsonLd(article: Article): string {
  const base = siteUrl();
  const url = `${base}${articleHref(article)}`;
  const section = article.kind === 'guide' ? { name: 'Guides', url: `${base}${GUIDES_HUB}` } : { name: 'Blog', url: `${base}${BLOG_ANCHOR}` };
  const graph: object[] = [
    {
      '@type': article.kind === 'guide' ? 'Article' : 'BlogPosting',
      headline: article.title,
      description: article.description,
      image: `${base}${coverSrc(article)}`,
      datePublished: article.published,
      dateModified: article.updated ?? article.published,
      inLanguage: 'en-US',
      mainEntityOfPage: url,
      author: { '@type': 'Organization', name: 'Next5', url: `${base}/` },
      publisher: { '@id': `${base}/#organization`, '@type': 'Organization', name: 'Next5', logo: { '@type': 'ImageObject', url: `${base}/icon.svg` } },
      keywords: article.keyword,
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${base}/` },
        { '@type': 'ListItem', position: 2, name: section.name, item: section.url },
        { '@type': 'ListItem', position: 3, name: article.title, item: url },
      ],
    },
  ];
  if (article.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: article.faq.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: plainText(a) } })),
    });
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}
