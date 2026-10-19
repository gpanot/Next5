// server-only — never import from a 'use client' file.

import { THEME } from '../../config/theme';

/** A list row under the body: a small picture (absolute URL, or none) next to one line of text. */
export type EmailItem = { text: string; imageUrl: string | null };

/** `settingsUrl`: where the footer's "Manage settings" leads (default: the studio settings). */
export type EmailContent = { subject: string; heading: string; body: string[]; items?: EmailItem[]; cta?: { label: string; url: string }; footnote?: string; settingsUrl?: string };

const escape = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const appUrl = (path: string): string => `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}${path}`;

/** Rows of a table (email clients ignore flex): 54x96 thumb (9:16) then the text. */
const renderItems = (items: EmailItem[]): string => {
  const rows = items.map((item) => {
    const thumb = item.imageUrl
      ? `<img src="${escape(item.imageUrl)}" width="54" height="96" alt="" style="display:block;width:54px;height:96px;object-fit:cover;border-radius:8px;border:1px solid ${THEME.line}">`
      : '';
    return `<tr><td width="66" style="padding:0 12px 12px 0;vertical-align:middle">${thumb}</td><td style="padding:0 0 12px;vertical-align:middle;font-size:15px;line-height:1.5;color:${THEME.ink}">${escape(item.text)}</td></tr>`;
  });
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 8px;border-collapse:collapse">${rows.join('')}</table>`;
};

/** Shared, single-column transactional layout (560 px, one CTA). */
export const renderEmail = (content: EmailContent): { subject: string; html: string; plain: string } => {
  const paragraphs = content.body.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${THEME.ink}">${escape(p)}</p>`).join('');
  const cta = content.cta
    ? `<a href="${escape(content.cta.url)}" style="display:inline-block;margin:8px 0 20px;background:${THEME.cta};color:${THEME.ctaInk};text-decoration:none;padding:12px 22px;border-radius:12px;font-size:15px;font-weight:600">${escape(content.cta.label)}</a>`
    : '';
  const html = `<div style="background:${THEME.ground};padding:32px 16px;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid ${THEME.line};border-radius:16px;padding:32px 28px">
<p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:20px;letter-spacing:4px;color:${THEME.ink}">NEXT5</p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${THEME.ink}">${escape(content.heading)}</h1>
${paragraphs}${content.items?.length ? renderItems(content.items) : ''}${cta}
${content.footnote ? `<p style="margin:12px 0 0;font-size:13px;color:${THEME.muted}">${escape(content.footnote)}</p>` : ''}
</div>
<p style="max-width:560px;margin:16px auto 0;font-size:12px;color:${THEME.muted};text-align:center">You’re receiving this because you have a Next5 workspace. <a href="${escape(content.settingsUrl ?? appUrl('/app/settings'))}"style="color:${THEME.muted}">Manage settings</a></p>
</div>`;
  const plain = [content.heading, '', ...content.body, ...(content.items ?? []).map((i) => i.text), '', content.cta ? `${content.cta.label}: ${content.cta.url}` : '', content.footnote ?? ''].join('\n').trim();
  return { subject: content.subject, html, plain };
};
