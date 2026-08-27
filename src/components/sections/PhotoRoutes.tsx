import type { PhotoRoute } from '../../data/site';
import { photoRoutes } from '../../data/site';
import { GiftIcon } from '../ui/Icons';
import { SectionHeading } from '../ui/SectionHeading';
import { RouteCard } from './RouteCard';

type PhotoRoutesProps = {
  onSelectRoute: (route: PhotoRoute) => void;
};

export const PhotoRoutes = ({ onSelectRoute }: PhotoRoutesProps) => (
  <section id="routes" className="scroll-mt-20 bg-surface py-16 sm:py-20 lg:py-24">
    <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
      <SectionHeading
        title="Choose your photo route"
        subtitle="All routes include 5 edited photos • 1 photographer • Venue access • Golden timing"
      />

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-4">
        {photoRoutes.map((route) => (
          <RouteCard key={route.number} route={route} onSelect={onSelectRoute} />
        ))}
      </div>

      <p className="mt-10 flex flex-wrap items-center justify-center gap-2 text-center text-[13px] text-muted">
        <GiftIcon className="h-4 w-4 text-ink/60" />
        <span>
          First time with us? Use code <strong className="font-semibold text-ink">NEXT5</strong> to
          get <strong className="font-semibold text-ink">10% off</strong>
        </span>
      </p>
    </div>
  </section>
);
