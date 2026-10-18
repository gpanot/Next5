import type { Metadata } from 'next';
import { GuidesHub } from '../../../src/components/guides/GuidesHub';

export const metadata: Metadata = {
  title: 'Guides and Blog: TikTok and Instagram Marketing for Small Business | Next5',
  description: 'Free guides on social media marketing for small businesses: how to make TikTok slideshows, plan a 30-day content calendar, write hooks and get customers.',
  alternates: { canonical: '/guides' },
};

/** Resources hub: Next5 guides, then the blog. */
export default function GuidesPage() {
  return <GuidesHub />;
}
