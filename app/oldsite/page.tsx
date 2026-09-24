import type { Metadata } from 'next';
import { BusinessHome } from '../../src/components/marketing/home/BusinessHome';
import { LegacyHashRedirect } from '../../src/components/marketing/home/LegacyHashRedirect';
import { MarketingShell } from '../../src/components/marketing/shared/MarketingShell';
import { PhotosHomePage } from '../../src/components/photos/PhotosHomePage';
import { isBusinessEnabled } from '../../src/config/business';

/**
 * Archived homepage (v1/v2 design). Preserved at /oldsite for reference.
 * The live homepage is now served from app/page.tsx (v3 design).
 */
export const generateMetadata = (): Metadata =>
  isBusinessEnabled()
    ? {
        title: 'Next5 — Photos and videos for realtors and TikTok Shop sellers (archived)',
        description:
          'New photos of you in your real listings, or of your products on a model. Plus UGC videos made by our team, every month, without a photoshoot.',
      }
    : { title: 'NEXT5 Photos — Your Next 5 Instagram Photos (archived)' };

export default function OldSitePage() {
  if (!isBusinessEnabled()) return <PhotosHomePage />;
  return (
    <MarketingShell>
      <LegacyHashRedirect />
      <BusinessHome />
    </MarketingShell>
  );
}
