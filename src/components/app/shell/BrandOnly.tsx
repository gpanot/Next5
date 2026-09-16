'use client';

import { CalendarDays } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '../../ui/EmptyState';
import { useAppRouter } from './AppLink';
import { useWorkspace } from './WorkspaceProvider';

/** The calendar plans one person's posts; Shop Studio has weekly drops instead. */
export const BrandOnly = ({ children }: { children: ReactNode }) => {
  const { product } = useWorkspace();
  const router = useAppRouter();
  if (product === 'brand') return <>{children}</>;
  return (
    <EmptyState
      illustration={<CalendarDays className="h-10 w-10" />}
      title="This is part of Brand Studio"
      body="Shop Studio keeps your rhythm with weekly drops instead."
      action={{ label: 'Go to Brand Studio', onClick: () => router.push('/app/brand') }}
    />
  );
};
