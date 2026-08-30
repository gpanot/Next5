'use client';

import { useScrolled } from '../../hooks/useScrolled';
import { useLocale } from '../../i18n/LocaleContext';
import { ButtonLink } from '../ui/Button';

type StickyMobileCtaProps = {
  hidden?: boolean;
};

/** Recaptures impulse intent lost mid-scroll on mobile, where the hero and
 *  pre-footer CTAs are otherwise the only ways to act. Desktop already has
 *  enough CTAs in view at any given scroll position, so this stays mobile-only. */
export const StickyMobileCta = ({ hidden = false }: StickyMobileCtaProps) => {
  const { t } = useLocale();
  const scrolledPastHero = useScrolled(500);
  const visible = scrolledPastHero && !hidden;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-page/95 px-5 pt-3 backdrop-blur-md transition-all duration-300 lg:hidden ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
      }`}
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <ButtonLink href="#routes" size="md" withArrow fullWidth>
        {t.common.createMyShoot}
      </ButtonLink>
    </div>
  );
};
