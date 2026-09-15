'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { apiFetch } from '../../../lib/apiClient';
import { scopeAppPath } from '../../../lib/studioPaths';
import type { BatchDetailDto } from '../../../types/business/batches';
import type { ProductLineDto } from '../../../types/business/me';
import { SkeletonText } from '../../ui/Skeleton';
import { useWorkspace } from './WorkspaceProvider';

/** Batches know their studio; everything else goes to the last-used studio (or the only one). */
const studioForPath = async (path: string, fallback: ProductLineDto): Promise<ProductLineDto> => {
  const batchId = path.match(/^\/app\/batches\/([^/?#]+)/)?.[1];
  if (!batchId) return fallback;
  try {
    const { batch } = await apiFetch<{ batch: BatchDetailDto }>(`/api/app/batches/${batchId}`);
    return batch.kind === 'shop_products' || batch.products.length > 0 ? 'shop' : 'brand';
  } catch {
    return fallback;
  }
};

/** Old links like /app/create or /app/batches/:id (bookmarks, emails) → the right studio. */
export const LegacyRedirect = () => {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const { me } = useWorkspace();
  const fallback = me?.workspace?.product ?? null;

  useEffect(() => {
    if (!fallback) return;
    let cancelled = false;
    const query = search.toString();
    const path = `${pathname}${query ? `?${query}` : ''}`;
    void studioForPath(path, fallback).then((studio) => {
      if (!cancelled) router.replace(scopeAppPath(path, studio));
    });
    return () => {
      cancelled = true;
    };
  }, [fallback, pathname, search, router]);

  return <div className="mx-auto w-full max-w-md px-5 py-24"><SkeletonText lines={3} /></div>;
};
