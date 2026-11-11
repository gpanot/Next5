import { redirect } from 'next/navigation';
import { LegacyRedirect } from '../../../src/components/app/shell/LegacyRedirect';
import { isStudio } from '../../../src/lib/studioPaths';

/** /app/brand/* and /app/shop/*. Any other first segment is an old URL (e.g. /app/create) and is forwarded. */
export default async function StudioLayout({ children, params }: LayoutProps<'/app/[studio]'>) {
  const { studio } = await params;
  // Shop Studio is hidden: we focus on Brand (Zillow import for realtors).
  if (studio === 'shop') redirect('/app/brand');
  return isStudio(studio) ? children : <LegacyRedirect />;
}
