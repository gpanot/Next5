'use client';

import Link from 'next/link';
import { STUDIO_LABEL, studioHref } from '../../../lib/studioPaths';
import type { ProductLineDto } from '../../../types/business/me';
import { BusinessLogo } from '../../marketing/shared/MarketingHeader';
import { useWorkspace } from './WorkspaceProvider';

const PITCH: Record<ProductLineDto, string> = {
  brand: 'New photos of you every month, with the words to post them. For realtors, coaches and beauty pros.',
  shop: 'Connect your TikTok Shop and get listing-ready photos of every new product, every week.',
};

/** Signed-in user opened a studio they haven't set up yet. */
export const AddStudio = ({ studio }: { studio: ProductLineDto }) => {
  const { me } = useWorkspace();
  const other = me?.workspaces.find((w) => w.product !== studio);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-5 py-12 text-center">
      <BusinessLogo />
      <div className="max-w-md">
        <h1 className="font-display text-[32px] font-semibold leading-tight tracking-[-0.02em] text-app-ink">Add {STUDIO_LABEL[studio]}</h1>
        <p className="mt-2 text-[15px] text-app-muted">{PITCH[studio]} Same account, separate plan. Your first 3 photos are free.</p>
      </div>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Link href={`/start/${studio}`} className="inline-flex h-11 items-center rounded-xl bg-app-accent px-5 text-[15px] font-medium text-app-accent-ink transition-opacity duration-200 hover:opacity-90">Set up {STUDIO_LABEL[studio]}</Link>
        {other && <Link href={studioHref(other.product)} className="text-[14px] text-app-muted hover:text-app-ink">Back to {STUDIO_LABEL[other.product]}</Link>}
      </div>
    </div>
  );
};
