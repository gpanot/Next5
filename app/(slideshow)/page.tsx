import type { Metadata } from 'next';
import { HomeJsonLd } from '../../src/components/admin/autoSlideshow/workspace/HomeJsonLd';
import { SlideshowHome } from '../../src/components/admin/autoSlideshow/workspace/SlideshowHome';
import { SLIDESHOW_PRICE_LABEL } from '../../src/types/admin/slideshowCredits';

const title = 'Next5: TikTok & Instagram Content for Small Businesses';
const description = `Paste your website. Next5 makes TikTok and Instagram slideshows and videos for your small business, on formats that already get views. ${SLIDESHOW_PRICE_LABEL} a post.`;

// Setting openGraph here drops the root opengraph-image, so it is listed again (same alt as app/opengraph-image.tsx).
const ogImage = { url: '/opengraph-image', width: 1200, height: 630, alt: 'Auto Slideshow: three TikTok slideshow covers made by Next5. Slideshows that bring you customers.' };

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/' },
  openGraph: { type: 'website', url: '/', siteName: 'Next5', locale: 'en_US', title, description, images: [ogImage] },
  twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
};

/** Auto Slideshow home, the site root: public. Log in leads to /slideshow/login, then into a workspace. */
export default function SlideshowPage() {
  return (
    <>
      <HomeJsonLd />
      <SlideshowHome />
    </>
  );
}
