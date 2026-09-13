'use client';

// ── Chip ─────────────────────────────────────────────────────────────────────

type ChipProps = {
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
};

export const Chip = ({ selected = false, onClick, className = '', children }: ChipProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={[
      'inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] transition-colors duration-200',
      'focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:outline-none',
      selected
        ? 'border-app-accent bg-app-accent-soft text-app-accent font-medium'
        : 'border-app-line bg-app-panel text-app-muted hover:border-app-accent/50 hover:text-app-ink',
      className,
    ].join(' ')}
  >
    {children}
  </button>
);

// ── ChipGroup ─────────────────────────────────────────────────────────────────

type ChipGroupProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T | T[];
  onChange: (value: T | T[]) => void;
  multi?: boolean;
  className?: string;
};

export const ChipGroup = <T extends string>({
  options,
  value,
  onChange,
  multi = false,
  className = '',
}: ChipGroupProps<T>) => {
  const selected = Array.isArray(value) ? value : [value];

  const toggle = (v: T) => {
    if (multi) {
      const next = selected.includes(v)
        ? selected.filter((s) => s !== v)
        : [...selected, v];
      onChange(next as T[]);
    } else {
      onChange(v);
    }
  };

  return (
    <div role="group" className={['flex flex-wrap gap-2', className].join(' ')}>
      {options.map(({ value: v, label }) => (
        <Chip key={v} selected={selected.includes(v)} onClick={() => toggle(v)}>
          {label}
        </Chip>
      ))}
    </div>
  );
};
