'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useApi } from '../../../hooks/useApi';
import { hasManifestImage } from '../../../lib/manifest';
import type { ThemeDto } from '../../../types/business/catalog';
import { Card } from '../../ui/Card';
import { SkeletonCard } from '../../ui/Skeleton';

const monthName = (month: string | null) =>
  month ? new Date(`${month}-15T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }) : 'This month';

export const FeaturedThemeCard = () => {
  const { data, loading } = useApi<{ featured: ThemeDto | null }>('/api/app/themes');
  if (loading) return <SkeletonCard />;
  const theme = data?.featured;
  if (!theme) return null;
  return (
    <Card className="overflow-hidden">
      <div className="grid sm:grid-cols-[180px_1fr]">
        <div className="relative aspect-[4/3] bg-app-sunken sm:aspect-auto">
          {hasManifestImage(theme.coverImage) && <Image src={theme.coverImage} alt={theme.title} fill sizes="180px" className="object-cover" />}
        </div>
        <div className="flex flex-col gap-2 p-5">
          <p className="label-caps text-[10px] font-medium text-app-accent">{monthName(theme.featuredMonth)} theme</p>
          <p className="text-[20px] font-semibold text-app-ink">{theme.title}</p>
          <p className="text-[14px] text-app-muted">{theme.description} · {theme.scenes.length} scenes</p>
          <Link href={`/app/create?theme=${theme.id}`} className="mt-auto inline-flex h-9 w-fit items-center rounded-xl bg-app-accent px-4 text-[13px] font-medium text-app-accent-ink hover:opacity-90">Create with this theme</Link>
        </div>
      </div>
    </Card>
  );
};
