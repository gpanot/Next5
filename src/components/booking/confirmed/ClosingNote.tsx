import type { CreativeDirector } from '../../../types/booking';
import { PlaceholderImage } from '../../ui/PlaceholderImage';

type ClosingNoteProps = {
  director: CreativeDirector;
};

/** The director's sign-off once the full set is ready — the studio visit
 *  ends with a person, not a delivery confirmation. */
export const ClosingNote = ({ director }: ClosingNoteProps) => (
  <figure className="mt-6 rounded-2xl border border-line bg-surface px-5 py-4.5">
    <figcaption className="flex items-center gap-2.5">
      <PlaceholderImage
        src={director.avatar}
        fallbackSrc={director.avatarFallback}
        alt=""
        label={director.name}
        className="h-9 w-9 shrink-0 rounded-full ring-1 ring-line"
        imageClassName="object-[50%_25%]"
      />
      <p className="text-[13.5px] font-medium text-ink">A note from {director.name}</p>
    </figcaption>

    <blockquote className="mt-3 text-[13px] leading-relaxed text-ink">
      {director.signature} Your studio is yours to keep — download whatever you love.
    </blockquote>

    <p className="mt-3.5 font-serif text-[19px] leading-none text-ink italic">{director.name}</p>
    <p className="mt-1 text-[11px] text-muted">Your Creative Director</p>
  </figure>
);
