'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import type { UgcAudience } from '../../../content/business/tiktokUgc';

type UgcWallTabsProps = {
  tabs: Record<UgcAudience, string>;
  panels: Record<UgcAudience, ReactNode>;
  initial?: UgcAudience;
};

const ORDER: UgcAudience[] = ['realtor', 'shop'];

/** Realtors / TikTok Shop switch over the video strip. */
export const UgcWallTabs = ({ tabs, panels, initial = 'realtor' }: UgcWallTabsProps) => {
  const [active, setActive] = useState<UgcAudience>(initial);
  return (
    <div className="flex flex-col gap-5 sm:gap-7">
      <div role="tablist" aria-label="Who the videos are for" className="inline-flex w-fit gap-1 rounded-full bg-app-sunken p-1">
        {ORDER.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`ugc-tab-${id}`}
            aria-selected={active === id}
            aria-controls={`ugc-panel-${id}`}
            onClick={() => setActive(id)}
            className="min-h-11 rounded-full px-5 text-[14px] font-medium text-app-muted transition-colors duration-200 hover:text-app-ink aria-selected:bg-app-panel aria-selected:text-app-ink aria-selected:shadow-sm"
          >
            {tabs[id]}
          </button>
        ))}
      </div>
      {ORDER.map((id) => (
        <div key={id} role="tabpanel" id={`ugc-panel-${id}`} aria-labelledby={`ugc-tab-${id}`} hidden={active !== id}>
          {panels[id]}
        </div>
      ))}
    </div>
  );
};
