import Link from 'next/link';
import { BusinessLogo } from './MarketingHeader';

const COLUMNS = [
  { title: 'Products', links: [{ href: '/brand', label: 'Brand Studio' }, { href: '/shop', label: 'Shop Studio' }, { href: '/photos', label: 'Next5 Photos' }] },
  { title: 'Company', links: [{ href: '/pricing', label: 'Pricing' }, { href: '/app', label: 'Log in' }, { href: 'mailto:hello@next5.studio', label: 'Contact' }] },
  { title: 'Legal', links: [{ href: '/legal/terms', label: 'Terms' }, { href: '/legal/privacy', label: 'Privacy' }, { href: '/legal/ai-and-face-data', label: 'AI & face data' }] },
] as const;

export const MarketingFooter = () => (
  <footer className="border-t border-app-line px-5 py-12 sm:px-8">
    <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:flex-row sm:justify-between">
      <div className="max-w-xs">
        <BusinessLogo />
        <p className="mt-4 text-[14px] text-app-muted">On-brand and on-model photos, every month, without a photoshoot.</p>
      </div>
      <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="label-caps text-[10px] font-medium text-app-muted">{column.title}</p>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[14px] text-app-ink transition-colors duration-200 hover:text-app-accent">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
    <p className="mx-auto mt-10 max-w-6xl text-[12px] text-app-muted">© {new Date().getFullYear()} Next5. Photos are AI-generated and labelled as such.</p>
  </footer>
);
