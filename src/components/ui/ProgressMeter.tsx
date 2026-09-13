type ProgressMeterProps = {
  used: number;
  total: number;
  label?: string;
  className?: string;
};

/**
 * Credits-used / total meter.
 * Turns warning tone when usage exceeds 80 % (< 20 % remaining).
 */
export const ProgressMeter = ({ used, total, label, className = '' }: ProgressMeterProps) => {
  const pct      = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const warn     = pct > 80;
  const remaining = total - used;

  return (
    <div className={['flex flex-col gap-1.5', className].join(' ')}>
      {label && (
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-app-muted">{label}</span>
          <span className={warn ? 'text-app-warning font-medium' : 'text-app-ink'}>
            {remaining} left
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={label ?? `${used} of ${total} used`}
        className="h-2 w-full overflow-hidden rounded-full bg-app-sunken"
      >
        <div
          className={[
            'h-full rounded-full transition-all duration-300',
            warn ? 'bg-app-warning' : 'bg-app-accent',
          ].join(' ')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
