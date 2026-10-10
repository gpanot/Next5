'use client';

import { BrandWebsite } from './BrandWebsite';
import { CastSection } from './CastSection';
import { ProductPhotos } from './ProductPhotos';

/** /slideshow/[workspaceId]/brand: the brand card read from the website, product photos, and the brand cast. */
export function BrandPage({ token, workspaceId }: { token: string; workspaceId: string }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-normal text-app-ink sm:text-3xl">Your brand</h1>
        <p className="text-sm text-app-muted">What we read from your website, your own photos, and the people in your posts.</p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <section aria-label="Your website" className="space-y-3">
          <h2 className="text-sm font-bold text-app-ink">From your website</h2>
          <BrandWebsite token={token} workspaceId={workspaceId} />
        </section>
        <div className="flex min-w-0 flex-col gap-8">
          <section aria-labelledby="product-photos-title" className="space-y-3">
            <div className="space-y-0.5">
              <h2 id="product-photos-title" className="text-sm font-bold text-app-ink">Product photos</h2>
              <p className="text-sm text-app-muted">Photos of the products you sell.</p>
            </div>
            <ProductPhotos token={token} workspaceId={workspaceId} />
          </section>
          <CastSection token={token} workspaceId={workspaceId} />
        </div>
      </div>
    </div>
  );
}
