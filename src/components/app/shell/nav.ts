import { CalendarDays, CreditCard, Grid3x3, Home, House, Images, Layers, Package, Plus, Settings, Sparkles, Store, type LucideIcon } from 'lucide-react';
import { studioHref } from '../../../lib/studioPaths';
import type { ProductLineDto } from '../../../types/business/me';

/** `bottom`: pinned to the lower part of the desktop sidebar (Billing, Settings). */
export type NavItem = { href: string; label: string; icon: LucideIcon; primary?: boolean; bottom?: boolean };

/** Each studio has its own menu; Settings is shared. Brand is realtors only: Listings (with its Library tab) is the main action; your face lives in Settings; no Brand page (campaigns read the website crawl). */
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
        { href: s('/billing'), label: 'Billing', icon: CreditCard, bottom: true },
        { href: '/app/settings', label: 'Settings', icon: Settings, bottom: true },
      ]
    : [
        { href: s(''), label: 'Home', icon: Home },
        { href: s('/calendar'), label: 'Calendar', icon: CalendarDays },
        { href: s('/automations'), label: 'Campaigns', icon: Sparkles },
        { href: s('/create'), label: 'Listings', icon: House, primary: true },
        { href: s('/billing'), label: 'Billing', icon: CreditCard, bottom: true },
        { href: '/app/settings', label: 'Settings', icon: Settings, bottom: true },
      ];
};

/** Bottom bar on phones: Home · Library/Campaigns · Create/Listings · Store/Calendar, then a More button (see BottomTabBar). */
export const mobileTabsFor = (studio: ProductLineDto): NavItem[] => {
  const s = (path: string) => studioHref(studio, path);
  return [
    { href: s(''), label: 'Home', icon: Home },
    studio === 'shop' ? { href: s('/library'), label: 'Library', icon: Images } : { href: s('/automations'), label: 'Campaigns', icon: Sparkles },
    studio === 'shop'
      ? { href: s('/create'), label: 'Create', icon: Plus, primary: true }
      : { href: s('/create'), label: 'Listings', icon: House, primary: true },
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
