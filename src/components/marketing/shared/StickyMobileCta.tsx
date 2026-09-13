'use client';

import { useScrolled } from '../../../hooks/useScrolled';
import { CtaLink } from './CtaLink';

/** Bottom CTA bar on phones, shown once the hero has scrolled away. */
export const StickyMobileCta = ({ href, label }: { href: string; label: string }) => {
  const visible = useScrolled(560);
  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-app-line bg-app-bg/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md transition-transform duration-300 md:hidden ${visible ? 'translate-y-0' : 'translate-y-full'}`}
    >
      <CtaLink href={href} className="w-full">{label}</CtaLink>
    </div>
  );
};
