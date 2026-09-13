'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

type Tab = { value: string; label: string };

// ── Uncontrolled (URL-synced) variant ─────────────────────────────────────────

type UrlTabsProps = {
  tabs: readonly Tab[];
  paramKey?: string;
  defaultTab?: string;
  className?: string;
};

export const UrlTabs = ({ tabs, paramKey = 'tab', defaultTab, className = '' }: UrlTabsProps) => {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const active      = searchParams.get(paramKey) ?? defaultTab ?? tabs[0]?.value;

  const navigate = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(paramKey, value);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, paramKey],
  );

  return <TabBar tabs={tabs} active={active} onSelect={navigate} className={className} />;
};

// ── Controlled variant ────────────────────────────────────────────────────────

type ControlledTabsProps = {
  tabs: readonly Tab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export const Tabs = ({ tabs, value, onChange, className = '' }: ControlledTabsProps) => (
  <TabBar tabs={tabs} active={value} onSelect={onChange} className={className} />
);

// ── Shared tab bar ────────────────────────────────────────────────────────────

type TabBarProps = {
  tabs: readonly Tab[];
  active: string;
  onSelect: (value: string) => void;
  className?: string;
};

const TabBar = ({ tabs, active, onSelect, className }: TabBarProps) => (
  <div
    role="tablist"
    className={['flex border-b border-app-line gap-1', className ?? ''].join(' ')}
  >
    {tabs.map((tab) => {
      const isActive = tab.value === active;
      return (
        <button
          key={tab.value}
          role="tab"
          type="button"
          aria-selected={isActive}
          onClick={() => onSelect(tab.value)}
          className={[
            'border-b-2 -mb-px px-4 py-3 text-[13px] font-medium transition-colors duration-200',
            'focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-1 focus-visible:outline-none',
            isActive
              ? 'border-app-accent text-app-ink'
              : 'border-transparent text-app-muted hover:text-app-ink',
          ].join(' ')}
        >
          {tab.label}
        </button>
      );
    })}
  </div>
);
