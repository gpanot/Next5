/**
 * Emails the owner the daily SEO run report (scripts/seo-daily.sh): one line per step, a Search Console
 * link, the weekly Google ranking on Mondays, then a copy of the article when the run shipped one.
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

/** Search Console, Performance report filtered to Next5 pages, with average position shown. */
const SEARCH_CONSOLE_URL =
  'https://search.google.com/search-console/performance/search-analytics?resource_id=sc-domain%3Agiinger.com' +
  '&page=*next5.giinger.com&metrics=CLICKS%2CIMPRESSIONS%2CCTR%2CPOSITION&num_of_months=3';

type QueryRow = { keys: string[]; clicks: number; impressions: number; position: number };

/** A searchanalytics.query response (dimension: query) saved by seo-daily.sh; no file means no data. */
const readRows = (file: string | undefined): QueryRow[] =>
  file ? ((JSON.parse(readFileSync(file, 'utf8')) as { rows?: QueryRow[] }).rows ?? []) : [];

const totals = (rows: readonly QueryRow[]) => {
  const impressions = rows.reduce((sum, r) => sum + r.impressions, 0);
  const clicks = rows.reduce((sum, r) => sum + r.clicks, 0);
  const position = impressions ? rows.reduce((sum, r) => sum + r.position * r.impressions, 0) / impressions : 0;
  return { impressions, clicks, position };
};

/** Lower position is better, so a drop in the number is shown as a climb. */
const movement = (now: number, before: number | undefined): string => {
  if (before === undefined) return 'new';
  const diff = before - now;
  if (Math.abs(diff) < 0.5) return '=';
  return diff > 0 ? `▲ ${diff.toFixed(1)}` : `▼ ${(-diff).toFixed(1)}`;
};

const renderRankings = (current: readonly QueryRow[], previous: readonly QueryRow[]): string => {
  const now = totals(current);
  const before = totals(previous);
  const earlier = new Map(previous.map((r) => [r.keys[0], r.position]));
  const top = [...current].sort((a, b) => b.impressions - a.impressions).slice(0, 15);
  const rows = top
    .map((r) => `<tr><td style="${cell}">${escapeHtml(r.keys[0])}</td><td style="${cell}">${r.position.toFixed(1)}</td><td style="${cell}">${movement(r.position, earlier.get(r.keys[0]))}</td><td style="${cell}">${r.impressions}</td><td style="${cell}">${r.clicks}</td></tr>`)
    .join('');
  const table = top.length
    ? `<table style="border-collapse:collapse;width:100%"><tr><th style="${cell}">Search</th><th style="${cell}">Position</th><th style="${cell}">vs last week</th><th style="${cell}">Shown</th><th style="${cell}">Clicks</th></tr>${rows}</table>`
    : '<p>No searches showed Next5 pages this week yet. New articles take 2 to 8 weeks to start ranking.</p>';
  return `<h2>Weekly Google ranking</h2>
<p>Last 7 days of data (Google reports about 3 days late) vs the 7 days before.<br>
Shown in Google: <strong>${now.impressions}</strong> (was ${before.impressions}) · Clicks: <strong>${now.clicks}</strong> (was ${before.clicks}) · Average position: <strong>${now.position ? now.position.toFixed(1) : '-'}</strong> (was ${before.position ? before.position.toFixed(1) : '-'}). Position 1 is the top result, 1 to 10 is page 1.</p>
${table}
<p><a href="${SEARCH_CONSOLE_URL}">Open the full ranking in Search Console</a></p>`;
};

const subjectFor =(date: string, steps: readonly Step[], article: Article | undefined): string => {
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
  // Mondays only: seo-daily.sh sets these to this week's and last week's Search Console data.
  const { SEO_SC_THIS_WEEK: thisWeek, SEO_SC_LAST_WEEK: lastWeek } = process.env;
  const rankings = thisWeek ? renderRankings(readRows(thisWeek), readRows(lastWeek)) : '';
  const link = `<p style="color:#666;font-size:13px"><a href="${SEARCH_CONSOLE_URL}">Your Google ranking in Search Console</a></p>`;
  const body = renderReport(steps) + link + rankings + (article && prUrl ? renderArticle(article, prUrl) : '');
  const html = `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:640px;margin:0 auto;color:#111;line-height:1.5">${body}</div>`;
  const plain = steps.map((s) => `${s.state.toUpperCase()}  ${s.label}`).join('\n');
  await sendEmail({ to, subject: subjectFor(date, steps, article), html, plain });
  console.log(`seo-email: sent report for ${date} to ${to}`);
};

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
