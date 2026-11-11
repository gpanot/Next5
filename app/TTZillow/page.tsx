import type { Metadata } from 'next';
import { HomePageV3 } from '../../src/components/marketing/home/HomePageV3';

export const metadata: Metadata = {
  title: 'Next5 | A month of videos without filming a single one',
  description:
    'Paste your Zillow link. In 2 minutes you are watching your first video, ready for TikTok, Instagram and Facebook. Your whole month is planned before you finish your coffee.',
  // Same page is served at /brand (2026-11-11); /brand is the main URL.
  alternates: { canonical: '/brand' },
};

/** Realtor homepage (v3), at /TTZillow and /brand (the site root is Auto Slideshow). Home services and TikTok Shop were dropped 2026-11-11. */
export default function HomePage() {
  return <HomePageV3 audience="realtor" />;
}
