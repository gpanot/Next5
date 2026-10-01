import type { ReactNode } from 'react';

/** Checkbox row with a 44px touch target. */
export function Toggle({ on, onChange, disabled, children }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; children: ReactNode }) {
  return (
    <label className={`flex min-h-11 items-center gap-3 text-sm text-ink dark:text-zinc-100 ${disabled ? 'opacity-50' : ''}`}>
      <input type="checkbox" checked={on} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 shrink-0 accent-blue-600" />
      <span>{children}</span>
    </label>
  );
}
