'use client';

import { useParams } from 'next/navigation';
import { AnalyticsApp } from '../../../../src/components/admin/autoSlideshow/analytics/AnalyticsApp';
import { UserGate } from '../../../../src/components/admin/autoSlideshow/UserGate';

/** One workspace's Analytics: its posted slideshows and how they perform. */
export default function SlideshowAnalyticsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  return <UserGate>{(token) => <AnalyticsApp token={token} workspaceId={workspaceId} />}</UserGate>;
}
