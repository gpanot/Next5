'use client';

import type { PhotoRoute } from '../../data/site';
import { photoRoutes } from '../../data/site';
import { useLocale } from '../../i18n/LocaleContext';
import type { DiscountOffer } from '../../types/offer';
import { SectionHeading } from '../ui/SectionHeading';
import { RouteCard } from './RouteCard';

type PhotoRoutesProps = {
  onSelectRoute: (route: PhotoRoute) => void;
  discountPercentFor: (routeId: string) => number;
  activeOffer: DiscountOffer | null;
  hasBookedBefore: boolean;
};

const OfferBanner = ({
  activeOffer,
  hasBookedBefore,
}: Pick<PhotoRoutesProps, 'activeOffer' | 'hasBookedBefore'>) => {
  const { t } = useLocale();

  const message = activeOffer
    ? t.routes.bannerOffer(activeOffer.label, activeOffer.percent, activeOffer.eligibleRouteIds.length)
    : hasBookedBefore
      ? t.routes.bannerReturning
      : t.routes.bannerFirstTime;

  return (
    <p className="label-caps mt-5 text-center text-[10px] font-medium text-accent-strong">{message}</p>
  );
};

export const PhotoRoutes = ({
  onSelectRoute,
  discountPercentFor,
  activeOffer,
  hasBookedBefore,
}: PhotoRoutesProps) => {
  const { t } = useLocale();

  return (
    <section id="routes" className="scroll-mt-20 bg-surface py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <SectionHeading title={t.routes.title} subtitle={t.routes.subtitle} />

        <OfferBanner activeOffer={activeOffer} hasBookedBefore={hasBookedBefore} />

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-4">
          {photoRoutes.map((route) => (
            <RouteCard
              key={route.number}
              route={route}
              onSelect={onSelectRoute}
              discountPercent={discountPercentFor(route.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
