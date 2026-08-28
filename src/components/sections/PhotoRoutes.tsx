import type { PhotoRoute } from '../../data/site';
import { photoRoutes } from '../../data/site';
import { SectionHeading } from '../ui/SectionHeading';
import { RouteCard } from './RouteCard';

type PhotoRoutesProps = {
  onSelectRoute: (route: PhotoRoute) => void;
};

export const PhotoRoutes = ({ onSelectRoute }: PhotoRoutesProps) => (
  <section id="routes" className="scroll-mt-20 bg-surface py-16 sm:py-20 lg:py-24">
    <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
      <SectionHeading
        title="Choose your studio"
        subtitle="5 personalized photos · Creative direction · Delivered within 4 hours · 149K VND"
      />

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-4">
        {photoRoutes.map((route) => (
          <RouteCard key={route.number} route={route} onSelect={onSelectRoute} />
        ))}
      </div>
    </div>
  </section>
);
