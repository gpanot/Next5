'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, type ComponentProps } from 'react';
import { scopeAppPath } from '../../../lib/studioPaths';
import { useOptionalWorkspace } from './WorkspaceProvider';

/** Scopes `/app/...` hrefs to the current studio (`/app/create` → `/app/shop/create`). Other hrefs pass through. */
export const useScopedPath = () => {
  const ws = useOptionalWorkspace();
  const studio = ws?.product ?? null;
  return useCallback((path: string) => (studio ? scopeAppPath(path, studio) : path), [studio]);
};

type AppLinkProps = ComponentProps<typeof Link> & { href: string };

/** next/link for app screens: studio-scoped hrefs. */
export const AppLink = ({ href, ...rest }: AppLinkProps) => {
  const scope = useScopedPath();
  return <Link href={scope(href)} {...rest} />;
};

/** useRouter with studio-scoped push/replace. */
export const useAppRouter = () => {
  const router = useRouter();
  const scope = useScopedPath();
  return useMemo(() => ({ ...router, push: (path: string) => router.push(scope(path)), replace: (path: string) => router.replace(scope(path)) }), [router, scope]);
};
