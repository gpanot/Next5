import type { CreativeDirector } from '../../../types/booking';
import { PlaceholderImage } from '../../ui/PlaceholderImage';

type DirectorNoteProps = {
  director: CreativeDirector;
  note: string | null;
};

/**
 * The shot arrives with a reason attached. This is what separates a studio from
 * a generator, so it holds its own space and skeletons rather than popping in.
 */
export const DirectorNote = ({ director, note }: DirectorNoteProps) => (
  <figure className="rounded-2xl border border-line bg-surface px-5 py-4.5">
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

    {note ? (
      <blockquote className="mt-3 text-[13px] leading-relaxed text-ink">{note}</blockquote>
    ) : (
      <div className="mt-3 space-y-2" aria-label="Writing your note">
        <span className="block h-2.5 w-full animate-pulse rounded-full bg-surface-alt" />
        <span className="block h-2.5 w-[92%] animate-pulse rounded-full bg-surface-alt" />
        <span className="block h-2.5 w-[68%] animate-pulse rounded-full bg-surface-alt" />
      </div>
    )}

    <p className="mt-3.5 font-serif text-[19px] leading-none text-ink italic">{director.name}</p>
    <p className="mt-1 text-[11px] text-muted">Your Creative Director</p>
  </figure>
);
