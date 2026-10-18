/**
 * Guides and blog posts are typed content, not Markdown: no parser dependency, and the
 * compiler checks every article. Inline text supports **bold** and [label](href) only.
 */
export type ArticleBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul' | 'ol'; items: readonly string[] }
  | { type: 'steps'; items: readonly { title: string; text: string }[] }
  | { type: 'tip'; title: string; text: string }
  | { type: 'table'; head: readonly string[]; rows: readonly (readonly string[])[] }
  | { type: 'cta'; title: string; text: string };

export type ArticleKind = 'guide' | 'blog';

export type ArticleFaq = { q: string; a: string };

export type Article = {
  kind: ArticleKind;
  slug: string;
  /** H1 and default <title>. */
  title: string;
  /** <title> override when the H1 is too long for search results (about 60 characters). */
  seoTitle?: string;
  /** Meta description, about 150 characters. */
  description: string;
  /** One or two lines on the hub card. */
  excerpt: string;
  /** The search phrase this page is built to rank for (from treg keyword research, US). */
  keyword: string;
  /** ISO date (YYYY-MM-DD). */
  published: string;
  updated?: string;
  /** Folder under public/images/auto-slideshow/ — a real slideshow Next5 made, used as the cover. */
  cover: string;
  coverAlt: string;
  blocks: readonly ArticleBlock[];
  faq?: readonly ArticleFaq[];
};
