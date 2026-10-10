import type { ComponentType } from 'react';
import { BrandIcon, CalendarIcon, CampaignIcon, ChartIcon, ContentIcon, CreditsIcon, IdeasIcon } from './navIcons';

/** Every workspace page. Brand and Credits: sidebar only (phones reach them from Settings). */
export type WorkspacePageId = 'ideas' | 'calendar' | 'campaigns' | 'content' | 'brand' | 'analytics' | 'credits';

export type WorkspaceNavItem = { id: WorkspacePageId; href: string; label: string; Icon: ComponentType };

/** The workspace menu, in order: the sidebar on wide screens and the bottom tabs on phones both read this. */
export const workspaceNavItems = (workspaceId: string): WorkspaceNavItem[] => {
  const base = `/slideshow/${workspaceId}`;
  return [
    { id: 'ideas', href: `${base}/ideas`, label: 'Ideas', Icon: IdeasIcon },
    { id: 'calendar', href: base, label: 'Calendar', Icon: CalendarIcon },
    { id: 'campaigns', href: `${base}/campaigns`, label: 'Campaigns', Icon: CampaignIcon },
    { id: 'content', href: `${base}/content`, label: 'Library', Icon: ContentIcon },
    { id: 'analytics', href: `${base}/analytics`, label: 'Analytics', Icon: ChartIcon },
  ];
};

/** Wide screens' sidebar only: phones reach the brand from Settings › Brand. */
export const brandNavItem = (workspaceId: string): WorkspaceNavItem => ({ id: 'brand', href: `/slideshow/${workspaceId}/brand`, label: 'Brand', Icon: BrandIcon });

/** Wide screens' sidebar only: phones reach credits from Settings › Credits. */
export const creditsNavItem = (workspaceId: string): WorkspaceNavItem => ({ id: 'credits', href: `/slideshow/${workspaceId}/credits`, label: 'Credits', Icon: CreditsIcon });

/** Which workspace page a path shows; the workspace root is the Calendar. */
export const pageOf = (pathname: string): WorkspacePageId => {
  if (pathname.endsWith('/ideas')) return 'ideas';
  if (pathname.endsWith('/analytics')) return 'analytics';
  if (pathname.endsWith('/campaigns')) return 'campaigns';
  if (pathname.endsWith('/content')) return 'content';
  if (pathname.endsWith('/brand')) return 'brand';
  if (pathname.endsWith('/credits')) return 'credits';
  return 'calendar';
};
