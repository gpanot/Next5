import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// A prospect's private review link: never indexed, never followed.
export const metadata: Metadata = {
  title: 'Your next 14 days of posts',
  robots: { index: false, follow: false },
};

export default function ProspectLayout({ children }: { children: ReactNode }) {
  return children;
}
