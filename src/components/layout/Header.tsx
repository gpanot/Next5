'use client';

import { useState } from 'react';
import { navLinks } from '../../data/site';
import { useScrolled } from '../../hooks/useScrolled';
import { useLocale } from '../../i18n/LocaleContext';
import { CloseIcon, MenuIcon } from '../ui/Icons';
import { Logo } from './Logo';
import { LocaleToggle } from './LocaleToggle';

export const Header = () => {
  const scrolled = useScrolled(60);
  const [menuOpen, setMenuOpen] = useState(false);
  const { locale } = useLocale();
  const dark = scrolled || menuOpen;

  return (
    <header
      className={[
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        dark
          ? 'border-b border-line bg-page/90 text-ink backdrop-blur-md'
          : 'border-b border-transparent bg-transparent text-white',
      ].join(' ')}
    >
      <div className="relative mx-auto flex h-18 max-w-[1240px] items-center justify-between px-5 sm:px-8 lg:px-10">
        <Logo className={dark ? 'text-ink' : 'text-white'} />

        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 lg:flex"
          aria-label="Primary"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative text-[13px] font-normal opacity-90 transition-opacity after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-current after:transition-all after:duration-300 hover:opacity-100 hover:after:w-full"
            >
              {link.label[locale]}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="/studio"
            className={[
              'hidden items-center rounded-full border px-4 py-1.5 text-[12px] transition-colors sm:flex',
              dark
                ? 'border-line text-ink hover:bg-surface-alt'
                : 'border-white/30 text-white hover:bg-white/10',
            ].join(' ')}
          >
            My Studio
          </a>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center lg:hidden"
          >
            {menuOpen ? <MenuIconSwap open /> : <MenuIconSwap />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          className="border-t border-line bg-page px-5 pb-6 lg:hidden"
          aria-label="Mobile primary"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block border-b border-line/70 py-4 font-serif text-lg text-ink last:border-0"
            >
              {link.label[locale]}
            </a>
          ))}
          <a
            href="/studio"
            onClick={() => setMenuOpen(false)}
            className="block border-b border-line/70 py-4 font-serif text-lg text-ink last:border-0"
          >
            My Studio
          </a>
          <div className="pt-4">
            <LocaleToggle tone="dark" />
          </div>
        </nav>
      )}
    </header>
  );
};

const MenuIconSwap = ({ open = false }: { open?: boolean }) =>
  open ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />;
