import { notFound } from 'next/navigation';
import { DevGallery } from '../../../src/components/dev/DevGallery';

export default function DevUiPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <DevGallery />;
}
