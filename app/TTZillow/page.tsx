import type { Metadata } from 'next';
import { HomePageV3 } from '../../src/components/marketing/home/HomePageV3';

export const metadata: Metadata = {
  title: 'Next5 | Your new listing on social media in 2 minutes',
  description:
    'Paste your Zillow link. In 2 minutes your listing is a video on proven real estate templates, ready for TikTok, Instagram and Facebook. Zero editing. $99/month, unlimited listings.',
  // Same page is served at /brand (2026-11-11); /brand is the main URL.
  alternates: { canonical: '/brand' },
};

/** Realtor homepage (v3), at /TTZillow and /brand (the site root is Auto Slideshow). Home services and TikTok Shop were dropped 2026-11-11. */
export default function HomePage() {
  return <HomePageV3 audience="realtor" />;
}
