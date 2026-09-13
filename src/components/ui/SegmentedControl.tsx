'use client';

type SegmentedControlProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  className = '',
}: SegmentedControlProps<T>) => (
  <div
    role="group"
    className={[
      'inline-flex rounded-xl border border-app-line bg-app-sunken p-0.5',
      className,
    ].join(' ')}
  >
    {options.map((opt) => {
      const active = opt.value === value;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={active}
          className={[
            'rounded-lg px-4 py-1.5 text-[13px] font-medium transition-colors duration-200',
            'focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-1 focus-visible:outline-none',
            active
              ? 'bg-app-panel text-app-ink shadow-sm'
              : 'text-app-muted hover:text-app-ink',
          ].join(' ')}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);
