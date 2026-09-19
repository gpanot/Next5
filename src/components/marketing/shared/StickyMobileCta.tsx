'use client';

import { useScrolled } from '../../../hooks/useScrolled';
import { CtaLink } from './CtaLink';

/** Bottom CTA bar on phones, shown once the hero has scrolled away. */
type StickyMobileCtaProps = { href: string; label: string; secondary?: { href: string; label: string }; note?: string };

export const StickyMobileCta = ({ href, label, secondary, note }: StickyMobileCtaProps) => {
  const visible = useScrolled(160);
  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-app-line bg-app-bg/95 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md transition-transform duration-300 md:hidden ${visible ? 'translate-y-0' : 'translate-y-full'}`}
    >
      {note && <p className="pb-2 text-center text-[12px] text-app-muted">{note}</p>}
      {secondary ? (
        <div className="grid grid-cols-2 gap-2">
          <CtaLink href={href} className="w-full px-3">{label}</CtaLink>
          <CtaLink href={secondary.href} className="w-full px-3">{secondary.label}</CtaLink>
        </div>
      ) : (
        <CtaLink href={href} className="w-full">{label}</CtaLink>
      )}
    </div>
  );
};
