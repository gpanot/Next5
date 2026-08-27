import type { PhotoRoute } from '../../../data/routes';
import { formatLongDate } from '../../../lib/date';
import type { Booking, Photographer, TimeSlot } from '../../../types/booking';
import { Button } from '../../ui/Button';
import { CameraIcon, CalendarIcon, ClockIcon, MapPinIcon } from '../../ui/Icons';
import { ShotFrame } from '../ui/ShotFrame';
import { StepFooter } from '../ui/StepFooter';

type ConfirmedStepProps = {
  route: PhotoRoute;
  photographer: Photographer;
  booking: Booking;
  slot: TimeSlot;
  onDone: () => void;
};

export const ConfirmedStep = ({
  route,
  photographer,
  booking,
  slot,
  onDone,
}: ConfirmedStepProps) => {
  const lines = [
    { icon: CalendarIcon, text: formatLongDate(booking.date) },
    { icon: ClockIcon, text: slot.label },
    { icon: CameraIcon, text: photographer.name },
    { icon: MapPinIcon, text: `${route.locationCount} locations · ${route.durationShort}` },
  ];

  return (
    <section className="animate-fade-in">
      <div className="text-center">
        <p className="label-caps text-[9.5px] font-medium text-accent-strong">Booking confirmed</p>
        <h2 className="mt-2 font-serif text-[30px] leading-tight tracking-[0.06em] text-ink uppercase sm:text-[36px]">
          You&apos;re booked 🎉
        </h2>
        <p className="mt-3 font-serif text-[20px] tracking-[0.07em] text-ink uppercase">
          {route.title}
        </p>
      </div>

      <ul className="mx-auto mt-6 flex max-w-md flex-wrap justify-center gap-x-6 gap-y-2.5">
        {lines.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-2 text-[13px] text-ink">
            <Icon className="h-4 w-4 text-ink/50" />
            {text}
          </li>
        ))}
      </ul>

      <p className="mt-5 text-center text-[12px] text-muted">
        Booking <span className="font-medium text-ink">#{booking.id}</span>
      </p>

      <h3 className="label-caps mt-9 text-center text-[9.5px] font-medium text-muted">
        Your {route.photoCount} shots
      </h3>

      <div className="mt-4 grid grid-cols-5 gap-1.5 sm:gap-2">
        {route.shots.map((shot, index) => (
          <div key={shot.src} className="group aspect-[3/4] overflow-hidden rounded-lg">
            <ShotFrame
              shot={shot}
              alt={`${route.title} — photo ${index + 1}`}
              className="h-full w-full"
            />
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-[12.5px] leading-relaxed text-muted">
        Confirmation details are on their way to{' '}
        <span className="text-ink">{booking.email}</span> and{' '}
        <span className="text-ink">{booking.phone}</span>.
      </p>

      <StepFooter>
        <Button onClick={onDone} variant="dark" size="lg" fullWidth className="sm:w-auto">
          Done
        </Button>
      </StepFooter>
    </section>
  );
};
