import { polaroidPhotos } from '../../data/site';
import { PlaceholderImage } from '../ui/PlaceholderImage';

const layout = [
  'left-0 top-6 -rotate-12 z-10',
  'left-[64px] top-1 -rotate-4 z-20',
  'left-[132px] top-4 rotate-5 z-30',
  'left-[200px] top-0 rotate-12 z-40',
] as const;

export const PolaroidStack = () => (
  <div
    className="relative h-[190px] w-[292px] shrink-0 scale-90 sm:scale-100"
    aria-label="Photos from previous shoots"
  >
    {polaroidPhotos.map((photo, index) => (
      <figure
        key={photo.src}
        className={`absolute w-[92px] rounded-[3px] bg-white p-1.5 pb-4 shadow-[0_12px_28px_-10px_rgb(0_0_0/0.7)] transition-transform duration-500 hover:z-50 hover:-translate-y-2 ${layout[index]}`}
      >
        <PlaceholderImage
          src={photo.src}
          alt={`Next5 shoot ${index + 1}`}
          label={photo.label}
          className="aspect-[3/4] w-full"
        />
      </figure>
    ))}
  </div>
);
