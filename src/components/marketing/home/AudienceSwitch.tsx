'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { HeroAudience } from '../../../content/business/home';

const ORDER: HeroAudience[] = ['realtor', 'shop'];

const AudienceContext = createContext<{ active: HeroAudience; setActive: (a: HeroAudience) => void } | null>(null);

const useAudience = () => {
  const ctx = useContext(AudienceContext);
  if (!ctx) throw new Error('AudienceSwitch parts must sit inside <AudienceProvider>');
  return ctx;
};

/** Shares the picked buyer (realtor / TikTok Shop) between the hero copy and the calendar. */
export const AudienceProvider = ({ children }: { children: ReactNode }) => {
  const [active, setActive] = useState<HeroAudience>('realtor');
  return <AudienceContext.Provider value={{ active, setActive }}>{children}</AudienceContext.Provider>;
};

/** Pill toggle: "I am a  [Realtor] [TikTok Shop seller]". */
export const AudienceToggle = ({ label, tabs }: { label: string; tabs: Record<HeroAudience, string> }) => {
  const { active, setActive } = useAudience();
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="text-[14px] text-app-muted">{label}</span>
      <div role="group" aria-label="Pick who you are" className="inline-flex gap-1 rounded-full bg-app-sunken p-1 ring-1 ring-app-line">
        {ORDER.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={active === id}
            onClick={() => setActive(id)}
            className="min-h-10 rounded-full px-4 text-[14px] font-medium text-app-muted transition-all duration-200 hover:text-app-ink aria-pressed:bg-app-ink aria-pressed:text-app-bg aria-pressed:shadow-sm"
          >
            {tabs[id]}
          </button>
        ))}
      </div>
    </div>
  );
};

/** Renders its (server-rendered) children only while `audience` is picked. */
export const AudienceOnly = ({ audience, children }: { audience: HeroAudience; children: ReactNode }) => {
  const { active } = useAudience();
  return active === audience ? <div className="animate-fade-in">{children}</div> : null;
};
