// server-only — never import from a 'use client' file.

import { THEME } from '../../config/theme';

export type EmailContent = { subject: string; heading: string; body: string[]; cta?: { label: string; url: string }; footnote?: string };

const escape = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const appUrl = (path: string): string => `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}${path}`;

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
${paragraphs}${cta}
${content.footnote ? `<p style="margin:12px 0 0;font-size:13px;color:${THEME.muted}">${escape(content.footnote)}</p>` : ''}
</div>
<p style="max-width:560px;margin:16px auto 0;font-size:12px;color:${THEME.muted};text-align:center">You’re receiving this because you have a Next5 workspace. <a href="${appUrl('/app/settings')}" style="color:${THEME.muted}">Manage settings</a></p>
</div>`;
  const plain = [content.heading, '', ...content.body, '', content.cta ? `${content.cta.label}: ${content.cta.url}` : '', content.footnote ?? ''].join('\n').trim();
  return { subject: content.subject, html, plain };
};
