import { notFound } from 'next/navigation';
import { redirect } from 'next/navigation';
import { isStudio } from '../../../../src/lib/studioPaths';

/** Catches old deep links such as /app/batches/:id so the studio layout can forward them.
 *  For valid studios (brand, shop) any unrecognised sub-path redirects to the studio root
 *  instead of 404-ing — e.g. /app/brand/login → /app/brand. */
export default async function LegacyDeepLinkPage({ params }: PageProps<'/app/[studio]/[...rest]'>) {
  const { studio } = await params;
  if (isStudio(studio)) redirect(`/app/${studio}`);
  notFound();
}
