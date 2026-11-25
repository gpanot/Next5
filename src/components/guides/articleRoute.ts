import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { articleHref, BLOG_POSTS, coverSize, coverSrc, findArticle, GUIDES } from '../../content/guides';
import type { Article, ArticleKind } from '../../content/guides/types';

/** Shared by /guides/[slug] and /blog/[slug]: every slug is known at build time. */
export const staticSlugs = (kind: ArticleKind): { slug: string }[] => (kind === 'guide' ? GUIDES : BLOG_POSTS).map(({ slug }) => ({ slug }));

export const loadArticle = async (kind: ArticleKind, params: Promise<{ slug: string }>): Promise<Article> => {
  const article = findArticle(kind, (await params).slug);
  if (!article) notFound();
  return article;
};

export const articleMetadata = (article: Article): Metadata => {
  const title = article.seoTitle ?? article.title;
  const url = articleHref(article);
  const src = coverSrc(article);
  // No cover: leave images out, so the site-wide app/opengraph-image is the preview.
  const images = src && article.cover ? [{ url: src, ...coverSize(article.cover), alt: article.coverAlt ?? article.title }] : undefined;
  return {
    title,
    description: article.description,
    alternates: { canonical: url },
    openGraph: { type: 'article', url, siteName: 'Next5', locale: 'en_US', title, description: article.description, publishedTime: article.published, modifiedTime: article.updated ?? article.published, images },
    twitter: { card: 'summary_large_image', title, description: article.description, images },
  };
};
