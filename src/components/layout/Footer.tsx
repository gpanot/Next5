import { navLinks, whatsAppUrl } from '../../data/site';
import { WhatsAppIcon } from '../ui/Icons';
import { Logo } from './Logo';

export const Footer = () => (
  <footer className="border-t border-line bg-cream">
    <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-6 px-5 py-10 sm:px-8 lg:flex-row lg:justify-between lg:px-10">
      <Logo className="text-ink" />

      <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3" aria-label="Footer">
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-[13px] text-muted transition-colors hover:text-ink"
          >
            {link.label}
          </a>
        ))}
        <a
          href={whatsAppUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-[13px] text-muted transition-colors hover:text-ink"
        >
          <WhatsAppIcon className="h-4 w-4" /> WhatsApp
        </a>
      </nav>

      <p className="text-[11.5px] text-muted">© {new Date().getFullYear()} NEXT5 Photos, Saigon</p>
    </div>
  </footer>
);
