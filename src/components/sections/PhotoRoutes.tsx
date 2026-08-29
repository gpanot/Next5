import type { PhotoRoute } from '../../data/site';
import { photoRoutes } from '../../data/site';
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
  if (activeOffer) {
    return (
      <p className="label-caps mt-5 text-center text-[10px] font-medium text-accent-strong">
        Your {activeOffer.label} discount (-{activeOffer.percent}%) is active on{' '}
        {activeOffer.eligibleRouteIds.length} studio{activeOffer.eligibleRouteIds.length === 1 ? '' : 's'}{' '}
        below
      </p>
    );
  }

  if (hasBookedBefore) {
    return (
      <p className="label-caps mt-5 text-center text-[10px] font-medium text-accent-strong">
        Welcome back — every studio below is already 10% off for you
      </p>
    );
  }

  return (
    <p className="label-caps mt-5 text-center text-[10px] font-medium text-accent-strong">
      New here? Your first studio is 50% off — applied automatically
    </p>
  );
};

export const PhotoRoutes = ({
  onSelectRoute,
  discountPercentFor,
  activeOffer,
  hasBookedBefore,
}: PhotoRoutesProps) => (
  <section id="routes" className="scroll-mt-20 bg-surface py-16 sm:py-20 lg:py-24">
    <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
      <SectionHeading
        title="Choose your studio"
        subtitle="5 personalized photos · Creative direction · Delivered within 4 hours"
      />

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
