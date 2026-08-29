import { previewTestimonials } from '../../../data/testimonials';
import { StarIcon } from '../../ui/Icons';

/** Two static proof points for the wait screen — a rating line and a
 *  manually-scrollable testimonial strip. Nothing here animates on its own;
 *  it only moves when she swipes it. */
export const PreviewSocialProof = () => (
  <div>
    <div className="flex items-center justify-center gap-2">
      <span className="flex gap-0.5 text-ink" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <StarIcon key={index} className="h-3 w-3" />
        ))}
      </span>
      <span className="text-[12.5px] font-medium text-ink">4.9</span>
      <span className="text-[12.5px] text-muted">(230+ reviews)</span>
    </div>

    <ul className="mt-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1">
      {previewTestimonials.map((testimonial) => (
        <li
          key={testimonial.name}
          className="w-[210px] shrink-0 snap-start rounded-xl border border-line bg-surface px-3.5 py-3 text-left"
        >
          <p className="text-[11.5px] leading-snug text-ink">&ldquo;{testimonial.quote}&rdquo;</p>
          <p className="mt-1.5 text-[10.5px] text-muted">— {testimonial.name}</p>
        </li>
      ))}
    </ul>
  </div>
);
