'use client';

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
};

export const Switch = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = '',
}: SwitchProps) => (
  <label className={['flex items-center gap-3 cursor-pointer', disabled ? 'opacity-50 cursor-not-allowed' : '', className].join(' ')}>
    <span className="relative">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span className={[
        'block h-6 w-11 rounded-full transition-colors duration-200',
        'peer-focus-visible:ring-2 peer-focus-visible:ring-app-accent peer-focus-visible:ring-offset-2',
        checked ? 'bg-app-cta' : 'bg-app-line',
      ].join(' ')} />
      <span className={[
        'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm',
        'transition-transform duration-200',
        checked ? 'translate-x-5' : 'translate-x-0',
      ].join(' ')} />
    </span>
    {label && <span className="text-[14px] text-app-ink">{label}</span>}
  </label>
);
