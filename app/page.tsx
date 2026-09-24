import type { Metadata } from 'next';
import { HomePageV3 } from '../src/components/marketing/home/HomePageV3';
import type { Audience } from '../src/components/marketing/home/HomePageV3';

export const metadata: Metadata = {
  title: 'Next5 | A month of videos without filming a single one',
  description:
    'Paste your Zillow link, TikTok Shop link, or website. In 2 minutes you are watching your first video. Your whole month is planned before you finish your coffee.',
};

const VALID_AUDIENCES: Audience[] = ['realtor', 'service', 'seller'];

/**
 * Homepage v3. Audience is read server-side from ?for= so the correct
 * segment renders on first paint with no layout shift.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const raw = (params.for ?? '').toLowerCase() as Audience;
  const audience: Audience = VALID_AUDIENCES.includes(raw) ? raw : 'realtor';
  return <HomePageV3 audience={audience} />;
}
