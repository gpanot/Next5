type PriceTagProps = {
  /** Price in USD cents (e.g. 1900 for $19). */
  cents: number;
  /** Optional original price in cents for strike-through. */
  originalCents?: number;
  suffix?: string;   // e.g. '/mo'
  className?: string;
};

/** Formats a USD price with optional strike-through and suffix. */
export const PriceTag = ({ cents, originalCents, suffix, className = '' }: PriceTagProps) => {
  const fmt = (c: number) => {
    const whole = Math.floor(c / 100);
    const frac  = c % 100;
    return frac === 0 ? `$${whole}` : `$${whole}.${String(frac).padStart(2, '0')}`;
  };

  return (
    <div className={['flex items-baseline gap-2', className].join(' ')}>
      {originalCents && originalCents !== cents && (
        <span className="text-[14px] text-app-muted line-through tabular-nums">{fmt(originalCents)}</span>
      )}
      <span className="text-[22px] font-semibold tabular-nums text-app-ink">{fmt(cents)}</span>
      {suffix && <span className="text-[13px] text-app-muted">{suffix}</span>}
    </div>
  );
};
