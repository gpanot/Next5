'use client';

type CheckboxProps = {
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: boolean;
  disabled?: boolean;
  className?: string;
};

export const Checkbox = ({
  label,
  checked,
  onChange,
  error = false,
  disabled = false,
  className = '',
}: CheckboxProps) => (
  <label className={['flex items-start gap-3 cursor-pointer', disabled ? 'opacity-50 cursor-not-allowed' : '', className].join(' ')}>
    <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-invalid={error || undefined}
        className="peer sr-only"
      />
      <span className={[
        'flex h-5 w-5 items-center justify-center rounded border transition-colors duration-200',
        'peer-focus-visible:ring-2 peer-focus-visible:ring-app-accent peer-focus-visible:ring-offset-1',
        checked
          ? 'border-app-cta bg-app-cta'
          : error
            ? 'border-app-danger bg-app-panel'
            : 'border-app-line bg-app-panel',
      ].join(' ')}>
        {checked && (
          <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1.5 6 4.5 9 10.5 3" />
          </svg>
        )}
      </span>
    </span>
    <span className="text-[14px] text-app-ink leading-snug">{label}</span>
  </label>
);
