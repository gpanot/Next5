import type { ReactNode } from 'react';
import { MarketingShell } from '../../src/components/marketing/shared/MarketingShell';
import { assertBusinessEnabled } from '../../src/server/guards';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  assertBusinessEnabled();
  return <MarketingShell>{children}</MarketingShell>;
}
