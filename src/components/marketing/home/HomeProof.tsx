import { Check } from 'lucide-react';
import { HOME_PROOF } from '../../../content/business/home';
import { CtaLink } from '../shared/CtaLink';
import { BeforeAfterSlider } from '../shop/BeforeAfterSlider';

/** Proof before promises: the real before/after slider next to three plain claims. */
export const HomeProof = () => (
  <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
    <div className="order-2 flex flex-col gap-4 lg:order-1">
      <ul className="flex flex-col gap-3">
        {HOME_PROOF.points.map((point) => (
          <li key={point} className="flex gap-3 text-[18px] text-app-ink">
            <Check aria-hidden className="mt-1 h-5 w-5 shrink-0 text-app-accent" />
            {point}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col items-start gap-2">
        <CtaLink href="/start/shop">{HOME_PROOF.cta}</CtaLink>
        <p className="text-[13px] text-app-muted">No card needed.</p>
      </div>
    </div>
    <div className="order-1 mx-auto w-full max-w-md lg:order-2">
      <BeforeAfterSlider />
    </div>
  </div>
);
