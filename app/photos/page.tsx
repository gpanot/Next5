import type { Metadata } from 'next';
import { PhotosHomePage } from '../../src/components/photos/PhotosHomePage';

export const metadata: Metadata = {
  title: 'NEXT5 Photos — Your Next 5 Instagram Photos',
  description:
    'A professional photoshoot, made for you. Choose your studio, show us your vibe, and get 5 personalized photos delivered within 30 minutes. First studio 149K VND — a first-shoot offer.',
};

export default function PhotosPage() {
  return <PhotosHomePage />;
}
