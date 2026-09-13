'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useScrolled } from '../../../hooks/useScrolled';
import { CtaLink } from './CtaLink';

const LINKS = [
  { href: '/brand', label: 'For professionals' },
  { href: '/shop', label: 'For shops' },
  { href: '/pricing', label: 'Pricing' },
] as const;

const ctaFor = (pathname: string): { href: string; label: string } => {
  if (pathname.startsWith('/shop')) return { href: '/start/shop', label: 'Try it free' };
  if (pathname.startsWith('/brand')) return { href: '/start/brand', label: 'Start free' };
  return { href: '/start/brand', label: 'Get started' };
};

export const BusinessLogo = () => (
  <Link href="/home-preview" className="block leading-none text-app-ink" aria-label="Next5 for business — home">
    <span className="font-serif text-[22px] font-medium tracking-[0.22em]">NEXT5</span>
    <span className="label-caps mt-0.5 block text-[8px] text-app-muted">for business</span>
  </Link>
);

export const MarketingHeader = () => {
  const scrolled = useScrolled(12);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const cta = ctaFor(pathname);

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 ${scrolled || open ? 'border-b border-app-line bg-app-bg/85 backdrop-blur-md' : 'border-b border-transparent bg-app-bg'}`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <BusinessLogo />
        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname.startsWith(link.href) ? 'page' : undefined}
              className="text-[14px] text-app-muted transition-colors duration-200 hover:text-app-ink aria-[current=page]:font-medium aria-[current=page]:text-app-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/app" className="hidden rounded-xl px-3 py-2 text-[14px] text-app-ink transition-colors duration-200 hover:bg-app-sunken sm:block">
            Log in
          </Link>
          <CtaLink href={cta.href} size="md" className="px-3 sm:px-4">{cta.label}</CtaLink>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-app-ink transition-colors duration-200 hover:bg-app-sunken md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Mobile" className="border-t border-app-line bg-app-bg px-5 pb-6 md:hidden">
          {[...LINKS, { href: '/app', label: 'Log in' }].map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="block border-b border-app-line py-4 text-[17px] text-app-ink">
              {link.label}
            </Link>
          ))}
          <CtaLink href={cta.href} className="mt-5 w-full">{cta.label}</CtaLink>
        </nav>
      )}
    </header>
  );
};
