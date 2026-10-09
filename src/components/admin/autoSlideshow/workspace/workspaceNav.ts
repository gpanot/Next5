import type { ComponentType } from 'react';
import { BrandIcon, CalendarIcon, ChartIcon, ContentIcon } from './navIcons';

export type WorkspacePageId = 'calendar' | 'content' | 'brand' | 'analytics';

export type WorkspaceNavItem = { id: WorkspacePageId; href: string; label: string; Icon: ComponentType };

/** The workspace menu, in order: the sidebar on wide screens and the bottom tabs on phones both read this. */
export const workspaceNavItems = (workspaceId: string): WorkspaceNavItem[] => {
  const base = `/slideshow/${workspaceId}`;
  return [
    { id: 'calendar', href: base, label: 'Calendar', Icon: CalendarIcon },
    { id: 'content', href: `${base}/content`, label: 'Content', Icon: ContentIcon },
    { id: 'brand', href: `${base}/brand`, label: 'Brand', Icon: BrandIcon },
    { id: 'analytics', href: `${base}/analytics`, label: 'Analytics', Icon: ChartIcon },
  ];
};

/** Which workspace page a path shows; the workspace root is the Calendar. */
export const pageOf = (pathname: string): WorkspacePageId => {
  if (pathname.endsWith('/analytics')) return 'analytics';
  if (pathname.endsWith('/content')) return 'content';
  if (pathname.endsWith('/brand')) return 'brand';
  return 'calendar';
};
