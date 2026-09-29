import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Slideshow Knowledge',
  robots: { index: false, follow: false },
};

export default function SlideshowKnowledgeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
