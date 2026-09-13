'use client';

import Link from 'next/link';
import { sessionTokenStore } from '../../../lib/localStore';
import { BusinessLogo } from '../../marketing/shared/MarketingHeader';

type NoWorkspaceProps = { email: string; hasConsumerBookings: boolean };

export const NoWorkspace = ({ email, hasConsumerBookings }: NoWorkspaceProps) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-5 py-12 text-center">
    <BusinessLogo />
    <div className="max-w-lg">
      <h1 className="font-serif text-[36px] font-medium leading-tight text-app-ink">Set up your studio</h1>
      <p className="mt-2 text-[15px] text-app-muted">You’re signed in as {email}. Choose the studio that fits your work.</p>
    </div>
    <div className="grid w-full max-w-lg gap-4 sm:grid-cols-2">
      <Link href="/start/brand" className="rounded-2xl border border-app-line bg-app-panel p-5 text-left shadow-sm transition-colors duration-200 hover:border-app-accent">
        <p className="text-[16px] font-semibold text-app-ink">Brand Studio</p>
        <p className="mt-1 text-[14px] text-app-muted">Monthly on-brand photos of you.</p>
      </Link>
      <Link href="/start/shop" className="rounded-2xl border border-app-line bg-app-panel p-5 text-left shadow-sm transition-colors duration-200 hover:border-app-accent">
        <p className="text-[16px] font-semibold text-app-ink">Shop Studio</p>
        <p className="mt-1 text-[14px] text-app-muted">On-model photos of your products.</p>
      </Link>
    </div>
    <div className="flex flex-col gap-2 text-[14px]">
      {hasConsumerBookings && <Link href="/studio" className="text-app-accent hover:text-app-ink">Looking for your Next5 Photos shoots? →</Link>}
      <button type="button" onClick={() => sessionTokenStore.set(null)} className="text-app-muted hover:text-app-ink">Sign out</button>
    </div>
  </div>
);
