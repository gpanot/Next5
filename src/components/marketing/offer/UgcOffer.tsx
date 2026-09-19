import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import type { UgcOffer as UgcOfferContent } from '../../../content/business/ugc';
import { UgcVideoMock } from './UgcVideoMock';

type UgcOfferProps = {
  points: UgcOfferContent['points'];
  /** Defaults to one phone; the home page passes two (realtor + shop). */
  visual: ReactNode;
};

/** UGC video offer: the phone(s) first on mobile, then plain checkable points. */
export const UgcOffer = ({ points, visual }: UgcOfferProps) => (
  <div className="grid items-center gap-6 sm:gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
    <div className="order-2 lg:order-1">
      <ul className="flex flex-col gap-2 sm:gap-3">
        {points.map((point) => (
          <li key={point} className="flex gap-3 text-[16px] text-app-ink sm:text-[18px]">
            <Check aria-hidden className="mt-1 h-5 w-5 shrink-0 text-app-accent" />
            {point}
          </li>
        ))}
      </ul>
    </div>
    <div className="order-1 lg:order-2">{visual}</div>
  </div>
);

/** Single-product UGC block for /brand and /shop. */
export const UgcOfferFor = ({ offer }: { offer: UgcOfferContent }) => (
  <UgcOffer points={offer.points} visual={<UgcVideoMock video={offer.video} />} />
);
