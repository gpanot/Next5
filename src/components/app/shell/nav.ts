import { CreditCard, Grid3x3, Home, Images, Layers, Package, Plus, Settings, type LucideIcon } from 'lucide-react';
import type { ProductLineDto } from '../../../types/business/me';

export type NavItem = { href: string; label: string; icon: LucideIcon; primary?: boolean };

export const navFor = (product: ProductLineDto): NavItem[] => [
  { href: '/app', label: 'Home', icon: Home },
  { href: '/app/create', label: 'Create', icon: Plus, primary: true },
  { href: '/app/library', label: 'Library', icon: Images },
  { href: '/app/sets', label: product === 'shop' ? 'Shop looks' : 'Sets', icon: Layers },
  ...(product === 'shop' ? [{ href: '/app/products', label: 'Products', icon: Package }] : []),
  { href: '/app/billing', label: 'Billing', icon: CreditCard },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

/** Bottom bar on phones: Home · Create · Library · Sets/Products · More. */
export const mobileTabsFor = (product: ProductLineDto): NavItem[] => [
  { href: '/app', label: 'Home', icon: Home },
  { href: '/app/library', label: 'Library', icon: Images },
  { href: '/app/create', label: 'Create', icon: Plus, primary: true },
  product === 'shop'
    ? { href: '/app/products', label: 'Products', icon: Package }
    : { href: '/app/sets', label: 'Sets', icon: Layers },
  { href: '/app/settings', label: 'More', icon: Grid3x3 },
];

export const isActive = (pathname: string, href: string): boolean =>
  href === '/app' ? pathname === '/app' : pathname === href || pathname.startsWith(`${href}/`);
