import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_ARTICLES, articleHref } from '../../src/content/guides';
import { BASE, QUALITY_BAR_SINCE, STATIC_LINK_TARGETS, STRICT } from '../../src/content/guides/qualityBar';
import type { Article, ArticleBlock } from '../../src/content/guides/types';

/**
 * The publish gate for guides and blog posts. The SEO agent runs this before every commit:
 * a red test means the article does not ship. Rules live in src/content/guides/qualityBar.ts.
 */

const blockStrings = (b: ArticleBlock): string[] => {
  switch (b.type) {
    case 'ul':
    case 'ol':
      return [...b.items];
    case 'steps':
      return b.items.flatMap((s) => [s.title, s.text]);
    case 'table':
      return [...b.head, ...b.rows.flat()];
    case 'tip':
    case 'cta':
      return [b.title, b.text];
    default:
      return [b.text];
  }
};

const allText = (a: Article): string[] => [
  a.title,
  a.description,
  a.excerpt,
  a.answer ?? '',
  ...a.blocks.flatMap(blockStrings),
  ...(a.faq ?? []).flatMap((f) => [f.q, f.a]),
];

const bodyText = (a: Article): string => [...a.blocks.flatMap(blockStrings), ...(a.faq ?? []).flatMap((f) => [f.q, f.a])].join(' ');

const wordCount = (a: Article): number => bodyText(a).replace(/\[(.+?)\]\(.+?\)/g, '$1').split(/\s+/).filter(Boolean).length;

const internalLinks = (a: Article): string[] =>
  [...allText(a).join('\n').matchAll(/\]\((\/[^)\s]*)\)/g)].map((m) => m[1].split('#')[0] || '/');

const ARTICLE_PATHS = new Set(ALL_ARTICLES.map(articleHref));
const MANIFEST: Record<string, unknown> = JSON.parse(readFileSync(join(process.cwd(), 'public/images/manifest.json'), 'utf8'));
const isIso = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));

describe('every article', () => {
  it('has a unique path and a unique target keyword', () => {
    const paths = ALL_ARTICLES.map(articleHref);
    expect(new Set(paths).size).toBe(paths.length);
    const keywords = ALL_ARTICLES.map((a) => a.keyword.trim().toLowerCase());
    const dupes = keywords.filter((k, i) => keywords.indexOf(k) !== i);
    expect(dupes, 'two articles chasing one keyword compete with each other: improve the existing one instead').toEqual([]);
  });

  for (const a of ALL_ARTICLES) {
    describe(articleHref(a), () => {
      it('has search-sized title and description', () => {
        expect((a.seoTitle ?? a.title).length).toBeLessThanOrEqual(BASE.maxTitle);
        expect(a.description.length).toBeGreaterThanOrEqual(BASE.minDescription);
        expect(a.description.length).toBeLessThanOrEqual(BASE.maxDescription);
      });

      it('has valid dates', () => {
        expect(isIso(a.published)).toBe(true);
        if (a.updated) {
          expect(isIso(a.updated)).toBe(true);
          expect(a.updated >= a.published).toBe(true);
        }
      });

      it('has its own cover, not shared with another article', () => {
        expect(ALL_ARTICLES.filter((other) => other.cover === a.cover).map((other) => other.slug)).toEqual([a.slug]);
      });

      it('uses a real cover: a Next5 slideshow, or a generated photo listed in the manifest', () => {
        if (a.cover.startsWith('/images/')) {
          expect(existsSync(join(process.cwd(), 'public', a.cover))).toBe(true);
          expect(Object.keys(MANIFEST)).toContain(`public${a.cover}`);
        } else {
          expect(existsSync(join(process.cwd(), 'public/images/auto-slideshow', a.cover, '1.jpg'))).toBe(true);
        }
      });

      it('has a call to action', () => {
        expect(a.blocks.some((b) => b.type === 'cta')).toBe(true);
      });

      it('only links to pages that exist', () => {
        const broken = internalLinks(a).filter((href) => !ARTICLE_PATHS.has(href) && !STATIC_LINK_TARGETS.includes(href));
        expect(broken).toEqual([]);
      });
    });
  }
});

describe(`articles published from ${QUALITY_BAR_SINCE}`, () => {
  const strict = ALL_ARTICLES.filter((a) => a.published >= QUALITY_BAR_SINCE);

  it('runs on the new articles (none yet is fine)', () => {
    expect(Array.isArray(strict)).toBe(true);
  });

  for (const a of strict) {
    describe(articleHref(a), () => {
      it('opens with a short, direct answer', () => {
        expect(a.answer, 'add `answer`: the reply to the search in 2 or 3 sentences').toBeTruthy();
        expect(a.answer!.length).toBeLessThanOrEqual(STRICT.maxAnswerChars);
      });

      it(`is ${STRICT.minWords} to ${STRICT.maxWords} words`, () => {
        const n = wordCount(a);
        expect(n).toBeGreaterThanOrEqual(STRICT.minWords);
        expect(n).toBeLessThanOrEqual(STRICT.maxWords);
      });

      it(`links to at least ${STRICT.minArticleLinks} other articles`, () => {
        const others = new Set(internalLinks(a).filter((h) => ARTICLE_PATHS.has(h) && h !== articleHref(a)));
        expect(others.size).toBeGreaterThanOrEqual(STRICT.minArticleLinks);
      });

      it(`answers at least ${STRICT.minFaq} questions`, () => {
        expect(a.faq?.length ?? 0).toBeGreaterThanOrEqual(STRICT.minFaq);
      });

      it('has no filler phrases', () => {
        const text = allText(a).join('\n').toLowerCase();
        expect(STRICT.bannedPhrases.filter((p) => text.includes(p.toLowerCase()))).toEqual([]);
      });

      it('is linked from at least one other article', () => {
        const href = articleHref(a);
        expect(ALL_ARTICLES.some((o) => o !== a && internalLinks(o).includes(href)), 'add a link to it from a page that already gets traffic').toBe(true);
      });
    });
  }
});
