'use client';

import { useCallback } from 'react';
import { adminTokenStore, useAdminToken } from '../../../../src/lib/adminToken';
import { AdminLogin } from '../../../../src/components/admin/AdminLogin';
import { AppTopBar } from '../../../../src/components/admin/autoSlideshow/AppTopBar';
import { PricingPage } from '../../../../src/components/admin/autoSlideshow/pricing/PricingPage';

/** Auto Slideshow pricing (demo): pay as you go, $1.99 per slideshow. Checkout is not wired yet. */
export default function AutoSlideshowPricingPage() {
  const token = useAdminToken();
  const handleToken = useCallback((t: string) => adminTokenStore.set(t), []);

  if (token === undefined) return null;
  if (!token) return <AdminLogin onToken={handleToken} />;

  return (
    <div className="min-h-dvh bg-app-bg">
      <AppTopBar page="pricing" />
      <main className="px-4 py-4 md:px-8 md:py-8">
        <PricingPage />
      </main>
    </div>
  );
}
