'use client';

import { isImpersonating } from './impersonation';
import { createLocalStore } from './localStore';

/** Admin JWT, shared by /admin and its standalone pages (same origin = same localStorage). */
export const adminTokenStore = createLocalStore('admin_token');

export const isAdminToken = (token: string): boolean => {
  try {
    return JSON.parse(atob(token.split('.')[1] ?? '')).type === 'admin';
  } catch {
    return false;
  }
};

/** undefined = not hydrated yet, null = signed out, string = valid admin token. */
export const useAdminToken = (): string | null | undefined => {
  const stored = adminTokenStore.useValue();
  if (stored === undefined) return undefined;
  return stored && isAdminToken(stored) ? stored : null;
};

/** True for the admin: signed in with the admin token, or in an "Open as user" tab. Admin-only tools show then. */
export const isAdminView = (token: string): boolean => isAdminToken(token) || isImpersonating();
