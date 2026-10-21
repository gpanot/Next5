import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { prospectShareCard } from '../../../../src/server/prospects/shareCard';

// A prospect's private review link: never indexed, never followed. Its share card names the business (opengraph-image.tsx).
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const card = await prospectShareCard(token, false).catch(() => null);
  const days = card?.days || 14;
  const title = card ? `${card.name}: your next ${days} days of posts` : `Your next ${days} days of posts`;
  const description = card
    ? `${days} days of TikTok and Instagram posts made for ${card.name}. Videos and slideshows, captions written, a day to post each one.`
    : 'TikTok and Instagram posts, captions written, a day to post each one.';
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { type: 'website', siteName: 'Next5', title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function ProspectLayout({ children }: { children: ReactNode }) {
  return children;
}
