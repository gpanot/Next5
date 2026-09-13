import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import { AppGate } from '../../src/components/app/shell/AppGate';
import { AppShell } from '../../src/components/app/shell/AppShell';
import { BusinessSurface } from '../../src/components/ui/BusinessSurface';
import { SkeletonText } from '../../src/components/ui/Skeleton';
import { assertBusinessEnabled } from '../../src/server/guards';

export const metadata: Metadata = { title: 'Next5 Studio', robots: { index: false } };

export default function AppLayout({ children }: { children: ReactNode }) {
  assertBusinessEnabled();
  return (
    <BusinessSurface>
      <Suspense fallback={<div className="mx-auto max-w-md px-5 py-24"><SkeletonText lines={4} /></div>}>
        <AppGate>
          <AppShell>{children}</AppShell>
        </AppGate>
      </Suspense>
    </BusinessSurface>
  );
}
