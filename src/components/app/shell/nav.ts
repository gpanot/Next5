import { BookMarked, CalendarDays, CreditCard, Grid3x3, Home, Images, Layers, Package, Plus, Settings, Sparkles, Store, type LucideIcon } from 'lucide-react';
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
        { href: s('/automations'), label: 'Campaigns', icon: Sparkles },
        { href: s('/library'), label: 'TikTok library', icon: Images },
        { href: s('/sets'), label: 'Studio Models', icon: Layers },
        { href: s('/billing'), label: 'Billing', icon: CreditCard },
        { href: '/app/settings', label: 'Settings', icon: Settings },
      ]
    : [
        { href: s(''), label: 'Home', icon: Home },
        { href: s('/calendar'), label: 'Calendar', icon: CalendarDays },
        { href: s('/automations'), label: 'Campaigns', icon: Sparkles },
        { href: s('/create'), label: 'Create', icon: Plus, primary: true },
        { href: s('/library'), label: 'Library', icon: Images },
        { href: s('/sets'), label: 'Influencers', icon: Layers },
        { href: s('/brand'), label: 'Brand', icon: BookMarked },
        { href: s('/billing'), label: 'Billing', icon: CreditCard },
        { href: '/app/settings', label: 'Settings', icon: Settings },
      ];
};

/** Bottom bar on phones: Home · Library · Create · Store/Calendar, then a More button (see BottomTabBar). */
export const mobileTabsFor = (studio: ProductLineDto): NavItem[] => {
  const s = (path: string) => studioHref(studio, path);
  return [
    { href: s(''), label: 'Home', icon: Home },
    { href: s('/library'), label: 'Library', icon: Images },
    { href: s('/create'), label: 'Create', icon: Plus, primary: true },
    studio === 'shop' ? { href: s('/store'), label: 'Store', icon: Store } : { href: s('/calendar'), label: 'Calendar', icon: CalendarDays },
  ];
};

export const MORE_ICON = Grid3x3;

/** Sidebar items that do not fit in the phone tab bar; shown in the More sheet. */
export const moreItemsFor = (studio: ProductLineDto): NavItem[] => {
  const tabs = new Set(mobileTabsFor(studio).map((t) => t.href));
  return navFor(studio).filter((item) => !tabs.has(item.href));
};

export const isActive = (pathname: string, href: string): boolean =>
  /^\/app\/(brand|shop)$/.test(href) ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
