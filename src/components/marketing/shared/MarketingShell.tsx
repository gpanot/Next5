import type { ReactNode } from 'react';
import { BusinessSurface } from '../../ui/BusinessSurface';
import { MarketingFooter } from './MarketingFooter';
import { MarketingHeader } from './MarketingHeader';

/** Business marketing chrome: header, main, footer on the business surface. */
export const MarketingShell = ({ children }: { children: ReactNode }) => (
  <BusinessSurface>
    <MarketingHeader />
    <main>{children}</main>
    <MarketingFooter />
  </BusinessSurface>
);
