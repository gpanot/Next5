'use client';

import { useState } from 'react';

export const BRAND_NAT_STYLES_URL = '/brand-nat-styles/index.html';

/** Admin › Brand Nat › Style Guide: the static style guide (105 styles with video previews), embedded as-is. */
export function BrandNatStylesTab() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative h-[calc(100dvh-7rem)] overflow-hidden rounded-xl border border-line bg-white shadow-sm md:h-[calc(100dvh-9rem)]">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse space-y-4 p-8" aria-hidden>
          <div className="h-10 w-2/3 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-5 w-1/2 rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="grid grid-cols-2 gap-3 pt-6 md:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-64 rounded-xl bg-zinc-100 dark:bg-zinc-800" />)}
          </div>
        </div>
      )}
      <iframe
        src={BRAND_NAT_STYLES_URL}
        title="Brand Nat Style Guide"
        allow="clipboard-write"
        onLoad={() => setLoaded(true)}
        className={`h-full w-full transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
