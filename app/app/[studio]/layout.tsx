import { LegacyRedirect } from '../../../src/components/app/shell/LegacyRedirect';
import { isStudio } from '../../../src/lib/studioPaths';

/** /app/brand/* and /app/shop/*. Any other first segment is an old URL (e.g. /app/create) and is forwarded. */
export default async function StudioLayout({ children, params }: LayoutProps<'/app/[studio]'>) {
  const { studio } = await params;
  return isStudio(studio) ? children : <LegacyRedirect />;
}
