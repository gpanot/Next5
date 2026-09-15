import { CreditCard, Grid3x3, Home, Images, Layers, Package, Plus, Settings, type LucideIcon } from 'lucide-react';
import { studioHref } from '../../../lib/studioPaths';
import type { ProductLineDto } from '../../../types/business/me';

export type NavItem = { href: string; label: string; icon: LucideIcon; primary?: boolean };

/** Each studio has its own menu; Settings is shared. */
export const navFor = (studio: ProductLineDto): NavItem[] => {
  const s = (path: string) => studioHref(studio, path);
  return studio === 'shop'
    ? [
        { href: s(''), label: 'Home', icon: Home },
        { href: s('/products'), label: 'Products', icon: Package },
        { href: s('/create'), label: 'Create drop', icon: Plus, primary: true },
        { href: s('/library'), label: 'Library', icon: Images },
        { href: s('/sets'), label: 'Shop looks', icon: Layers },
        { href: s('/billing'), label: 'Billing', icon: CreditCard },
        { href: '/app/settings', label: 'Settings', icon: Settings },
      ]
    : [
        { href: s(''), label: 'Home', icon: Home },
        { href: s('/create'), label: 'Create', icon: Plus, primary: true },
        { href: s('/library'), label: 'Library', icon: Images },
        { href: s('/sets'), label: 'Sets', icon: Layers },
        { href: s('/billing'), label: 'Billing', icon: CreditCard },
        { href: '/app/settings', label: 'Settings', icon: Settings },
      ];
};

/** Bottom bar on phones: Home · Library · Create · Products/Sets · More. */
export const mobileTabsFor = (studio: ProductLineDto): NavItem[] => {
  const s = (path: string) => studioHref(studio, path);
  return [
    { href: s(''), label: 'Home', icon: Home },
    { href: s('/library'), label: 'Library', icon: Images },
    { href: s('/create'), label: 'Create', icon: Plus, primary: true },
    studio === 'shop' ? { href: s('/products'), label: 'Products', icon: Package } : { href: s('/sets'), label: 'Sets', icon: Layers },
    { href: '/app/settings', label: 'More', icon: Grid3x3 },
  ];
};

export const isActive = (pathname: string, href: string): boolean =>
  /^\/app\/(brand|shop)$/.test(href) ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
