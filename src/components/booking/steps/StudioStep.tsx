import type { PhotoRoute } from '../../../data/routes';
import { applyDiscount } from '../../../lib/format';
import { Button } from '../../ui/Button';
import { StudioGallery } from '../studio/StudioGallery';
import { PriceTag } from '../ui/PriceTag';
import { StepActions, StepLayout } from '../ui/StepLayout';

type StudioStepProps = {
  route: PhotoRoute;
  onNext: () => void;
  /** From the value ladder — intro, repeat, or a claimed bundle. Never 0. */
  discountPercent: number;
};

/**
 * Deliberately thin: the five frames are the pitch. The scene names live as
 * captions on the frames themselves rather than in a second list below, and the
 * long description is left on the route card — nobody reads it twice.
 */
export const StudioStep = ({ route, onNext, discountPercent }: StudioStepProps) => (
  <StepLayout
    footer={
      <StepActions
        hint={
          <PriceTag
            amountVnd={applyDiscount(route.priceVnd, discountPercent)}
            originalAmountVnd={route.priceVnd}
            note="5 personalized photos · 30-min delivery"
          />
        }
      >
        <Button onClick={onNext} size="lg" withArrow fullWidth className="sm:w-auto">
          Create my shoot
        </Button>
      </StepActions>
    }
  >
    <header className="flex items-end justify-between gap-6">
      <div>
        <p className="label-caps text-[9.5px] font-medium text-accent-strong">Your studio</p>
        <h2 className="mt-2 font-serif text-[26px] leading-none tracking-[0.08em] text-ink uppercase sm:text-[30px]">
          {route.title}
        </h2>
        <p className="mt-2 text-[13.5px] text-muted">
          {route.tagline} <span className="text-ink">5 scenes, 5 photos.</span>
        </p>
      </div>

      <p className="hidden shrink-0 text-right text-[11.5px] text-muted sm:block">
        Tap any frame to
        <br />
        see it full screen
      </p>
    </header>

    <div className="mt-4">
      <StudioGallery route={route} />
    </div>
  </StepLayout>
);
