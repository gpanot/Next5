import type { BookingStep } from '../../types/booking';

const stages: readonly { step: BookingStep; label: string }[] = [
  { step: 'studio', label: 'Studio' },
  { step: 'style', label: 'Style' },
  { step: 'intention', label: 'Your vibe' },
  { step: 'upload', label: 'Upload' },
  { step: 'preview', label: 'Preview' },
  { step: 'payment', label: 'Payment' },
];

type BookingProgressProps = {
  current: BookingStep;
};

const barStyles = (position: number, index: number) => {
  if (position < index) return 'bg-accent/45';
  if (position === index) return 'bg-accent';
  return 'bg-line';
};

const labelStyles = (position: number, index: number) => {
  if (position === index) return 'text-ink';
  if (position < index) return 'text-muted';
  return 'text-muted/45';
};

export const BookingProgress = ({ current }: BookingProgressProps) => {
  const index = stages.findIndex((stage) => stage.step === current);
  const active = stages[Math.max(index, 0)];

  return (
    <div>
      <ol className="flex items-start gap-1.5 sm:gap-2.5">
        {stages.map((stage, position) => (
          <li key={stage.step} className="min-w-0 flex-1">
            <span
              aria-hidden="true"
              className={`block h-[3px] rounded-full transition-colors duration-500 ${barStyles(position, index)}`}
            />
            <span
              className={`label-caps mt-2 hidden truncate text-[8.5px] font-medium transition-colors duration-500 sm:block ${labelStyles(position, index)}`}
            >
              {stage.label}
            </span>
          </li>
        ))}
      </ol>

      <p className="label-caps mt-2 text-[9px] font-medium text-muted sm:hidden">
        Step {index + 1} of {stages.length} · <span className="text-ink">{active.label}</span>
      </p>

      <p className="sr-only" aria-live="polite">
        Step {index + 1} of {stages.length}: {active.label}
      </p>
    </div>
  );
};
