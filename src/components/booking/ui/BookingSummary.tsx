import type { PhotoRoute } from '../../../data/routes';
import { formatLongDate } from '../../../lib/date';
import { formatVnd } from '../../../lib/format';
import type { Photographer, TimeSlot } from '../../../types/booking';
import { CameraIcon, ClockIcon, MapPinIcon, PhotoIcon, CalendarIcon } from '../../ui/Icons';

type BookingSummaryProps = {
  route: PhotoRoute;
  photographer: Photographer;
  date: string;
  slot: TimeSlot;
  showPrice?: boolean;
};

export const BookingSummary = ({
  route,
  photographer,
  date,
  slot,
  showPrice = true,
}: BookingSummaryProps) => {
  const lines = [
    { icon: CalendarIcon, text: formatLongDate(date) },
    { icon: ClockIcon, text: `${slot.label} · ${route.durationShort}` },
    { icon: CameraIcon, text: photographer.name },
    { icon: MapPinIcon, text: `${route.locationCount} curated locations` },
    { icon: PhotoIcon, text: `${route.photoCount} Instagram photos` },
  ];

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h3 className="font-serif text-[19px] tracking-[0.07em] text-ink uppercase">{route.title}</h3>

      <ul className="mt-4 space-y-2.5">
        {lines.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-2.5 text-[13px] text-ink">
            <Icon className="h-4 w-4 shrink-0 text-ink/50" />
            {text}
          </li>
        ))}
      </ul>

      {showPrice && (
        <p className="mt-5 border-t border-line pt-4 font-serif text-[22px]">
          <span className="text-gold">{formatVnd(route.priceVnd)}</span>{' '}
          <span className="text-ink">VND</span>
        </p>
      )}
    </div>
  );
};
