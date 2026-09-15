import { notFound } from 'next/navigation';
import { isStudio } from '../../../../src/lib/studioPaths';

/** Catches old deep links such as /app/batches/:id so the studio layout can forward them. */
export default async function LegacyDeepLinkPage({ params }: PageProps<'/app/[studio]/[...rest]'>) {
  const { studio } = await params;
  if (isStudio(studio)) notFound();
  return null;
}
