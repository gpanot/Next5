import type { ComponentType } from 'react';
import { CalendarIcon, ChartIcon, ContentIcon, CreditsIcon, IdeasIcon } from './navIcons';

/** Every workspace page. Brand is not in the menu: it opens from Settings › Brand. Credits: sidebar only. */
export type WorkspacePageId = 'ideas' | 'calendar' | 'content' | 'brand' | 'analytics' | 'credits';

export type WorkspaceNavItem = { id: WorkspacePageId; href: string; label: string; Icon: ComponentType };

/** The workspace menu, in order: the sidebar on wide screens and the bottom tabs on phones both read this. */
export const workspaceNavItems = (workspaceId: string): WorkspaceNavItem[] => {
  const base = `/slideshow/${workspaceId}`;
  return [
    { id: 'ideas', href: `${base}/ideas`, label: 'Ideas', Icon: IdeasIcon },
    { id: 'calendar', href: base, label: 'Calendar', Icon: CalendarIcon },
    { id: 'content', href: `${base}/content`, label: 'Library', Icon: ContentIcon },
    { id: 'analytics', href: `${base}/analytics`, label: 'Analytics', Icon: ChartIcon },
  ];
};

/** Wide screens' sidebar only: phones reach credits from Settings › Credits. */
export const creditsNavItem = (workspaceId: string): WorkspaceNavItem => ({ id: 'credits', href: `/slideshow/${workspaceId}/credits`, label: 'Credits', Icon: CreditsIcon });

/** Which workspace page a path shows; the workspace root is the Calendar. */
export const pageOf = (pathname: string): WorkspacePageId => {
  if (pathname.endsWith('/ideas')) return 'ideas';
  if (pathname.endsWith('/analytics')) return 'analytics';
  if (pathname.endsWith('/content')) return 'content';
  if (pathname.endsWith('/brand')) return 'brand';
  if (pathname.endsWith('/credits')) return 'credits';
  return 'calendar';
};
