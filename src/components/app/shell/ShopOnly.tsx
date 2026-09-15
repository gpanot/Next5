'use client';

import { Store } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '../../ui/EmptyState';
import { useAppRouter } from './AppLink';
import { useWorkspace } from './WorkspaceProvider';

/** Store and Products belong to Shop Studio; in Brand Studio, point to the right place. */
export const ShopOnly = ({ children }: { children: ReactNode }) => {
  const { product } = useWorkspace();
  const router = useAppRouter();
  if (product === 'shop') return <>{children}</>;
  return <EmptyState illustration={<Store className="h-10 w-10" />} title="This is part of Shop Studio" body="Connect your TikTok Shop and photograph your products there." action={{ label: 'Go to Shop Studio', onClick: () => router.push('/app/shop/store') }} />;
};
