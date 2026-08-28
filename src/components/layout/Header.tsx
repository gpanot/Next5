'use client';

import { useState } from 'react';
import { navLinks, whatsAppUrl } from '../../data/site';
import { useScrolled } from '../../hooks/useScrolled';
import { CloseIcon, MenuIcon, WhatsAppIcon } from '../ui/Icons';
import { Logo } from './Logo';

export const Header = () => {
  const scrolled = useScrolled(60);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className={[
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        scrolled || menuOpen
          ? 'border-b border-line bg-page/90 text-ink backdrop-blur-md'
          : 'border-b border-transparent bg-transparent text-white',
      ].join(' ')}
    >
      <div className="relative mx-auto flex h-18 max-w-[1240px] items-center justify-between px-5 sm:px-8 lg:px-10">
        <Logo className={scrolled || menuOpen ? 'text-ink' : 'text-white'} />

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
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Chat with us on WhatsApp"
            className={[
              'hidden h-10 w-10 items-center justify-center rounded-full border transition-colors duration-300 sm:flex',
              scrolled || menuOpen
                ? 'border-line hover:border-ink/40'
                : 'border-white/50 hover:border-white',
            ].join(' ')}
          >
            <WhatsAppIcon className="h-5 w-5" />
          </a>

          <a
            href="#routes"
            className="label-caps rounded-full bg-ink-block px-6 py-3 text-[10px] font-medium text-on-dark transition-transform duration-300 hover:scale-[1.03] sm:px-7"
          >
            Create my shoot
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
              {link.label}
            </a>
          ))}
          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center gap-2 text-[13px] text-muted"
          >
            <WhatsAppIcon className="h-4.5 w-4.5" /> WhatsApp us
          </a>
        </nav>
      )}
    </header>
  );
};

const MenuIconSwap = ({ open = false }: { open?: boolean }) =>
  open ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />;
