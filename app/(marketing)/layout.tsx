import type { ReactNode } from 'react';
import { MarketingFooter } from '../../src/components/marketing/shared/MarketingFooter';
import { MarketingHeader } from '../../src/components/marketing/shared/MarketingHeader';
import { BusinessSurface } from '../../src/components/ui/BusinessSurface';
import { assertBusinessEnabled } from '../../src/server/guards';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  assertBusinessEnabled();
  return (
    <BusinessSurface>
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </BusinessSurface>
  );
}
