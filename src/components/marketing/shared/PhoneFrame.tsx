import type { ReactNode } from 'react';

type PhoneFrameProps = { children: ReactNode; label?: string; className?: string };

/** A pure-CSS phone frame for UI mocks — no real platform UI inside. */
export const PhoneFrame = ({ children, label, className = '' }: PhoneFrameProps) => (
  <figure className={`flex flex-col items-center gap-3 ${className}`}>
    <div className="relative w-full rounded-[2.2rem] border border-black/10 bg-[#1f1c19] p-2 shadow-lg dark:border-white/10">
      <div className="absolute left-1/2 top-3 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-black" aria-hidden />
      <div className="relative overflow-hidden rounded-[1.8rem] bg-app-panel">{children}</div>
    </div>
    {label && <figcaption className="label-caps text-[10px] font-medium text-app-muted">{label}</figcaption>}
  </figure>
);
