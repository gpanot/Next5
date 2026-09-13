import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'NEXT5 Photos — Your studio',
  description: 'Your Next5 Photos shoots and deliveries.',
};

export default function StudioLayout({ children }: { children: ReactNode }) {
  return children;
}
