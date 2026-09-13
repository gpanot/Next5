'use client';

type ColorInputProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
};

export const ColorInput = ({ value, onChange, label, className = '' }: ColorInputProps) => (
  <div className={['flex items-center gap-3', className].join(' ')}>
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-app-line">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label ?? 'Pick a colour'}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        style={{ width: '200%', height: '200%', top: '-50%', left: '-50%' }}
      />
      <span className="block h-full w-full rounded-xl" style={{ background: value }} aria-hidden="true" />
    </div>
    {label && <span className="text-[13px] text-app-ink">{label}</span>}
    <span className="ml-auto font-mono text-[12px] text-app-muted uppercase">{value}</span>
  </div>
);
