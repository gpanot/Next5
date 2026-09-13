'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonCard, SkeletonText } from '../../ui/Skeleton';
import { BannerStack } from './BannerStack';
import { BottomTabBar } from './BottomTabBar';
import { CreditsPill } from './CreditsPill';
import { NoWorkspace } from './NoWorkspace';
import { SidebarNav } from './SidebarNav';
import { useWorkspace } from './WorkspaceProvider';

type PageFrameProps = { title: string; actions?: ReactNode; children: ReactNode };

/** Page chrome inside the shell: title row, credits pill, banner, content. */
export const AppPage = ({ title, actions, children }: PageFrameProps) => (
  <div className="flex min-w-0 flex-1 flex-col">
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-app-line bg-app-bg/90 px-5 backdrop-blur-md sm:px-8">
      <h1 className="truncate text-[20px] font-semibold text-app-ink sm:text-[22px]">{title}</h1>
      <div className="flex items-center gap-2">
        {actions}
        <CreditsPill />
        <Link href="/app/create" className="hidden h-9 items-center gap-1.5 rounded-xl bg-app-accent px-3 text-[13px] font-medium text-app-accent-ink transition-opacity duration-200 hover:opacity-90 sm:flex">
          <Plus aria-hidden className="h-4 w-4" /> Create
        </Link>
      </div>
    </header>
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 pb-28 pt-6 sm:px-8 lg:pb-12">
      <BannerStack />
      {children}
    </div>
  </div>
);

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { me, loading, error, refresh } = useWorkspace();

  if (!me && loading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:px-8">
        <SkeletonText lines={2} />
        <div className="grid gap-4 md:grid-cols-2"><SkeletonCard /><SkeletonCard /></div>
      </div>
    );
  }
  if (!me) return <div className="mx-auto max-w-md px-5 py-24"><ErrorState message={error ?? 'Could not load your workspace.'} onRetry={refresh} /></div>;
  if (!me.workspace) return <NoWorkspace email={me.user.email} hasConsumerBookings={me.hasConsumerBookings} />;

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      {children}
      <BottomTabBar />
    </div>
  );
};
