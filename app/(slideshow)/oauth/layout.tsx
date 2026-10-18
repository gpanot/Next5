import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/** Claude connector sign-in: private, kept out of search and AI indexes. */
export const metadata: Metadata = { title: 'Connect Claude to Next5', robots: { index: false, follow: false } };

export default function OAuthLayout({ children }: { children: ReactNode }) {
  return children;
}
