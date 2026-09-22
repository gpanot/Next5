import { CalendarDays, CreditCard, Grid3x3, Home, Images, Layers, Package, Plus, Settings, Store, type LucideIcon } from 'lucide-react';
import { studioHref } from '../../../lib/studioPaths';
import type { ProductLineDto } from '../../../types/business/me';

export type NavItem = { href: string; label: string; icon: LucideIcon; primary?: boolean };

/** Each studio has its own menu; Settings is shared. */
export const navFor = (studio: ProductLineDto): NavItem[] => {
  const s = (path: string) => studioHref(studio, path);
  return studio === 'shop'
    ? [
        { href: s(''), label: 'Home', icon: Home },
        { href: s('/store'), label: 'Store', icon: Store },
        { href: s('/products'), label: 'Products', icon: Package },
        { href: s('/create'), label: 'Create drop', icon: Plus, primary: true },
        { href: s('/library'), label: 'TikTok library', icon: Images },
        { href: s('/sets'), label: 'Shop looks', icon: Layers },
        { href: s('/billing'), label: 'Billing', icon: CreditCard },
        { href: '/app/settings', label: 'Settings', icon: Settings },
      ]
    : [
        { href: s(''), label: 'Home', icon: Home },
        { href: s('/calendar'), label: 'Calendar', icon: CalendarDays },
        { href: s('/create'), label: 'Create', icon: Plus, primary: true },
        { href: s('/library'), label: 'Library', icon: Images },
        { href: s('/sets'), label: 'Influencers', icon: Layers },
        { href: s('/billing'), label: 'Billing', icon: CreditCard },
        { href: '/app/settings', label: 'Settings', icon: Settings },
      ];
};

/** Bottom bar on phones: Home · Calendar/Library · Create · Store/Calendar · More. */
export const mobileTabsFor = (studio: ProductLineDto): NavItem[] => {
  const s = (path: string) => studioHref(studio, path);
  return [
    { href: s(''), label: 'Home', icon: Home },
    { href: s('/library'), label: 'Library', icon: Images },
    { href: s('/create'), label: 'Create', icon: Plus, primary: true },
    studio === 'shop' ? { href: s('/store'), label: 'Store', icon: Store } : { href: s('/calendar'), label: 'Calendar', icon: CalendarDays },
    { href: '/app/settings', label: 'More', icon: Grid3x3 },
  ];
};

export const isActive = (pathname: string, href: string): boolean =>
  /^\/app\/(brand|shop)$/.test(href) ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
