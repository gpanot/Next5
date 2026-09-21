'use client';

type RadioOption<T extends string> = { value: T; label: React.ReactNode };

type RadioGroupProps<T extends string> = {
  options: readonly RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  name: string;
  error?: boolean;
  disabled?: boolean;
  className?: string;
};

export const RadioGroup = <T extends string>({
  options,
  value,
  onChange,
  name,
  error = false,
  disabled = false,
  className = '',
}: RadioGroupProps<T>) => (
  <div role="radiogroup" className={['flex flex-col gap-2', className].join(' ')}>
    {options.map((opt) => (
      <label
        key={opt.value}
        className={[
          'flex items-center gap-3 cursor-pointer',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            disabled={disabled}
            onChange={() => onChange(opt.value)}
            className="peer sr-only"
          />
          <span className={[
            'flex h-5 w-5 items-center justify-center rounded-full border transition-colors duration-200',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-app-accent peer-focus-visible:ring-offset-1',
            value === opt.value ? 'border-app-cta' : error ? 'border-app-danger' : 'border-app-line',
          ].join(' ')}>
            {value === opt.value && (
              <span className="h-2.5 w-2.5 rounded-full bg-app-cta" />
            )}
          </span>
        </span>
        <span className="text-[14px] text-app-ink">{opt.label}</span>
      </label>
    ))}
  </div>
);
