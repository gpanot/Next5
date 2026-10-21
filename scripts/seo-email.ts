/**
 * Emails the owner the daily SEO run report (scripts/seo-daily.sh): one line per step, then a copy of
 * the article when the run shipped one.
 * Usage: npx tsx scripts/seo-email.ts <date> <report file> [slug] [pr url]
 * Report file: one "ok|fail|skip<TAB>label" line per step. Needs SENDING_KEY (Maileroo) and SEO_EMAIL_TO.
 */
import { readFileSync } from 'node:fs';
import { ALL_ARTICLES, articleHref, coverSrc } from '../src/content/guides';
import type { Article, ArticleBlock } from '../src/content/guides/types';
import { sendEmail } from '../src/lib/maileroo';

const SITE = 'https://next5.giinger.com';

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Inline text supports **bold** and [label](href) only (see types.ts). */
const inline = (text: string): string =>
  escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, label: string, href: string) => `<a href="${href.startsWith('/') ? SITE + href : href}">${label}</a>`);

const cell = 'border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top';
const box = 'background:#f4f6f8;border-radius:12px;padding:12px 16px;margin:16px 0';

const renderBlock = (block: ArticleBlock): string => {
  switch (block.type) {
    case 'p':
      return `<p>${inline(block.text)}</p>`;
    case 'h2':
      return `<h2>${inline(block.text)}</h2>`;
    case 'h3':
      return `<h3>${inline(block.text)}</h3>`;
    case 'ul':
    case 'ol':
      return `<${block.type}>${block.items.map((item) => `<li>${inline(item)}</li>`).join('')}</${block.type}>`;
    case 'steps':
      return `<ol>${block.items.map((step) => `<li><strong>${inline(step.title)}</strong> ${inline(step.text)}</li>`).join('')}</ol>`;
    case 'tip':
    case 'cta':
      return `<div style="${box}"><strong>${inline(block.title)}</strong><br>${inline(block.text)}</div>`;
    case 'table': {
      const head = block.head.map((h) => `<th style="${cell}">${inline(h)}</th>`).join('');
      const rows = block.rows.map((row) => `<tr>${row.map((c) => `<td style="${cell}">${inline(c)}</td>`).join('')}</tr>`).join('');
      return `<table style="border-collapse:collapse;width:100%"><tr>${head}</tr>${rows}</table>`;
    }
  }
};

type Step = { state: 'ok' | 'fail' | 'skip'; label: string };

const readReport = (file: string): Step[] =>
  readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [state, ...label] = line.split('\t');
      return { state: state === 'ok' || state === 'skip' ? state : 'fail', label: label.join(' ') };
    });

const MARKS: Record<Step['state'], string> = { ok: '✅', fail: '❌', skip: '⏸️' };

const renderReport = (steps: readonly Step[]): string =>
  `<h2 style="margin-top:0">Run report</h2><ul style="list-style:none;padding:0">${steps
    .map((s) => `<li>${MARKS[s.state]} ${escapeHtml(s.label)}</li>`)
    .join('')}</ul>`;

const renderArticle = (article: Article, prUrl: string): string => {
  const url = SITE + articleHref(article);
  const faq = (article.faq ?? []).map((f) => `<p><strong>${inline(f.q)}</strong><br>${inline(f.a)}</p>`).join('');
  return `<p><a href="${url}">Open the live page</a> · <a href="${prUrl}">PR</a> (to undo: press Revert on the PR, or ask Claude to revert it)</p>
<hr>
<p style="color:#666;font-size:13px">Keyword: ${escapeHtml(article.keyword)} · Hub: ${article.hub}<br>Google title: ${escapeHtml(article.seoTitle ?? article.title)}<br>Description: ${escapeHtml(article.description)}</p>
<img src="${SITE}${coverSrc(article)}" alt="${escapeHtml(article.coverAlt)}" width="320" style="border-radius:12px;max-width:100%">
<h1>${inline(article.title)}</h1>
${article.answer ? `<div style="${box}">${inline(article.answer)}</div>` : ''}
${article.blocks.map(renderBlock).join('\n')}
${faq ? `<h2>FAQ</h2>${faq}` : ''}`;
};

const subjectFor = (date: string, steps: readonly Step[], article: Article | undefined): string => {
  const failed = steps.find((s) => s.state === 'fail');
  if (failed) return `❌ SEO run ${date}: problem, ${failed.label}`;
  if (!article) return `⏸️ SEO run ${date}: no article today`;
  return `✅ SEO run ${date}: all ${steps.length} steps done, ${article.title}`;
};

const main = async (): Promise<void> => {
  const [date, reportFile, slug, prUrl] = process.argv.slice(2);
  const to = process.env.SEO_EMAIL_TO;
  if (!date || !reportFile || !to) throw new Error('seo-email: missing date, report file or SEO_EMAIL_TO');
  const steps = readReport(reportFile);
  const article = slug ? ALL_ARTICLES.find((a) => a.slug === slug) : undefined;
  if (slug && !article) steps.push({ state: 'fail', label: `Article "${slug}" not found for the email copy` });
  const body = renderReport(steps) + (article && prUrl ? renderArticle(article, prUrl) : '');
  const html = `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:640px;margin:0 auto;color:#111;line-height:1.5">${body}</div>`;
  const plain = steps.map((s) => `${s.state.toUpperCase()}  ${s.label}`).join('\n');
  await sendEmail({ to, subject: subjectFor(date, steps, article), html, plain });
  console.log(`seo-email: sent report for ${date} to ${to}`);
};

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
