import type { Metadata } from 'next';
import { BusinessHome } from '../src/components/marketing/home/BusinessHome';
import { LegacyHashRedirect } from '../src/components/marketing/home/LegacyHashRedirect';
import { MarketingShell } from '../src/components/marketing/shared/MarketingShell';
import { PhotosHomePage } from '../src/components/photos/PhotosHomePage';
import { isBusinessEnabled } from '../src/config/business';

export const generateMetadata = (): Metadata =>
  isBusinessEnabled()
    ? {
        title: 'Next5 — Photos of you that work as hard as you do',
        description: 'On-brand photos for professionals and on-model photos for online shops, every month, without a photoshoot.',
      }
    : { title: 'NEXT5 Photos — Your Next 5 Instagram Photos' };

/** `/` is the business home when NEXT5_BUSINESS_ENABLED=true; otherwise (rollback) the consumer home, also at /photos. */
export default function HomePage() {
  if (!isBusinessEnabled()) return <PhotosHomePage />;
  return (
    <MarketingShell>
      <LegacyHashRedirect />
      <BusinessHome />
    </MarketingShell>
  );
}
