'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Dialog } from '../../../ui/Dialog';
import { LegalSections, type LegalSection } from '../../../marketing/legal/LegalPage';
import { BusinessLogo } from '../../../marketing/shared/MarketingHeader';
import { BLOG_ANCHOR, GUIDES_HUB } from '../../../../content/guides';
import { LEGAL_UPDATED, PRIVACY, TERMS } from '../../../../content/business/legal';
import { InstagramGlyph, TikTokGlyph } from './PlatformBadges';
import { SOCIAL_LINKS, type SocialName } from './siteLinks';
import { SLIDESHOW_HOME, SLIDESHOW_LOGIN, SLIDESHOW_PRICING, SLIDESHOW_SIGNUP } from './WorkspaceContext';

type LegalDoc = { key: string; label: string; title: string; href: string; sections: readonly LegalSection[] };

// /terms and /privacy are always public; /legal/* only exists when the business site is on.
const LEGAL_DOCS: readonly LegalDoc[] = [
  { key: 'terms', label: 'Terms of Service', title: 'Terms of Service', href: '/terms', sections: TERMS },
  { key: 'privacy', label: 'Privacy Policy', title: 'Privacy Policy', href: '/privacy', sections: PRIVACY },
];

const PRODUCT_LINKS = [
  { label: 'Make slideshows', href: SLIDESHOW_SIGNUP },
  { label: 'Pricing', href: SLIDESHOW_PRICING },
  { label: 'Log in', href: SLIDESHOW_LOGIN },
] as const;

const RESOURCE_LINKS = [
  { label: 'Guides', href: GUIDES_HUB },
  { label: 'Blog', href: BLOG_ANCHOR },
  { label: 'TikTok slideshows', href: '/blog/how-to-make-a-slideshow-on-tiktok' },
  { label: 'Content calendar', href: '/blog/social-media-content-calendar' },
] as const;

const SOCIAL_GLYPHS: Record<SocialName, typeof TikTokGlyph> = { Instagram: InstagramGlyph, TikTok: TikTokGlyph };

const linkClass = 'inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-ink md:min-h-9 dark:text-zinc-400 dark:hover:text-zinc-100';
const headingClass = 'text-xs font-semibold tracking-wide text-ink uppercase dark:text-zinc-200';

function SocialButtons() {
  return (
    <ul className="flex gap-3">
      {SOCIAL_LINKS.map(({ name, handle, href }) => {
        const Glyph = SOCIAL_GLYPHS[name];
        return (
          <li key={name}>
            <a
              href={href}
              target="_blank"
              rel="me noopener noreferrer"
              aria-label={`Next5 on ${name} (${handle})`}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-white text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-ink dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500"
            >
              <Glyph className="h-5 w-5" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function FooterColumn({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <nav aria-label={title} className={className}>
      <h2 className={headingClass}>{title}</h2>
      <ul className="mt-3 flex flex-col">{children}</ul>
    </nav>
  );
}

/** Public Auto Slideshow footer: brand, product links, legal, socials. Legal links are real (crawlers and Google app review need them); a normal click opens the doc in a modal so users stay on the page. */
export function PublicFooter() {
  const [openDoc, setOpenDoc] = useState<LegalDoc | null>(null);
  return (
    <footer className="border-t border-line bg-white px-4 pt-12 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-8 md:pt-16 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <div className="col-span-2 flex flex-col gap-4 md:col-span-1">
          <BusinessLogo href={SLIDESHOW_HOME} />
          <p className="max-w-xs text-sm leading-relaxed text-muted dark:text-zinc-400">TikTok and Instagram posts for small businesses. Made from your website. No filming, no editing.</p>
          <SocialButtons />
        </div>
        <FooterColumn title="Product">
          {PRODUCT_LINKS.map(({ label, href }) => (
            <li key={label}><Link href={href} className={linkClass}>{label}</Link></li>
          ))}
        </FooterColumn>
        <FooterColumn title="Resources">
          {RESOURCE_LINKS.map(({ label, href }) => (
            <li key={label}><Link href={href} className={linkClass}>{label}</Link></li>
          ))}
        </FooterColumn>
        <FooterColumn title="Legal">
          {LEGAL_DOCS.map((doc) => (
            <li key={doc.key}>
              <a
                href={doc.href}
                onClick={(event) => {
                  event.preventDefault();
                  setOpenDoc(doc);
                }}
                className={linkClass}
              >
                {doc.label}
              </a>
            </li>
          ))}
        </FooterColumn>
        {/* Phones already get the social icon buttons under the logo. */}
        <FooterColumn title="Follow us" className="hidden md:block">
          {SOCIAL_LINKS.map(({ name, href }) => (
            <li key={name}><a href={href} target="_blank" rel="me noopener noreferrer" className={linkClass}>{name}</a></li>
          ))}
        </FooterColumn>
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-2 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:text-zinc-500">
        <p>© {new Date().getFullYear()} Next5. All rights reserved.</p>
        <p>Made for US small businesses.</p>
      </div>
      <Dialog open={openDoc !== null} onClose={() => setOpenDoc(null)} title={openDoc?.title} description={`Last updated ${LEGAL_UPDATED}`} className="max-w-2xl">
        <div className="-mx-6 -my-6 flex max-h-[70dvh] flex-col gap-6 overflow-y-auto overscroll-contain px-6 py-6 text-left">
          {openDoc && <LegalSections sections={openDoc.sections} />}
        </div>
      </Dialog>
    </footer>
  );
}
