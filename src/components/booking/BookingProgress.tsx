import type { BookingStep } from '../../types/booking';

const stages: readonly { step: BookingStep; label: string }[] = [
  { step: 'route', label: 'Your photos' },
  { step: 'date', label: 'Date' },
  { step: 'photographer', label: 'Photographer' },
  { step: 'checkout', label: 'Details' },
  { step: 'payment', label: 'Payment' },
];

type BookingProgressProps = {
  current: BookingStep;
};

export const BookingProgress = ({ current }: BookingProgressProps) => {
  const index = current === 'confirmed' ? stages.length - 1 : stages.findIndex((s) => s.step === current);
  const label = current === 'confirmed' ? 'Confirmed' : stages[Math.max(index, 0)].label;

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 items-center gap-1" aria-hidden="true">
        {stages.map((stage, position) => (
          <span
            key={stage.step}
            className={[
              'h-[3px] flex-1 rounded-full transition-colors duration-500',
              position <= index || current === 'confirmed' ? 'bg-accent' : 'bg-line',
            ].join(' ')}
          />
        ))}
      </div>
      <p className="label-caps shrink-0 text-[9px] font-medium text-muted">
        {current === 'confirmed' ? label : `Step ${index + 1} · ${label}`}
      </p>
    </div>
  );
};
