'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { UgcVideoStatus } from '../../../../types/admin/ugc';

// Shared UGC Lab building blocks. Same look as the rest of the admin (ModelTestTab, OverviewTab).

export const fieldClass =
  'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-ink/10 transition-shadow';

export const labelClass = 'flex flex-col gap-1 text-[12px] font-medium text-muted';

type SectionProps = { title: string; description?: ReactNode; actions?: ReactNode; children?: ReactNode };

export const Section = ({ title, description, actions, children }: SectionProps) => (
  <section className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
        {description && <p className="text-[13px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
    {children}
  </section>
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const PrimaryButton = ({ className = '', type = 'button', ...props }: ButtonProps) => (
  <button
    type={type}
    className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 ${className}`}
    {...props}
  />
);

export const SecondaryButton = ({ className = '', type = 'button', ...props }: ButtonProps) => (
  <button
    type={type}
    className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-ink transition-colors hover:bg-surface-alt disabled:opacity-40 ${className}`}
    {...props}
  />
);

export const DangerButton = ({ className = '', ...props }: ButtonProps) => (
  <SecondaryButton className={`text-red-700 ${className}`} {...props} />
);

type PillProps = { active: boolean; onClick: () => void; disabled?: boolean; children: ReactNode };

export const Pill = ({ active, onClick, disabled, children }: PillProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] transition-colors disabled:opacity-40 ${
      active ? 'bg-ink text-white' : 'bg-white text-muted ring-1 ring-line hover:text-ink'
    }`}
  >
    {children}
  </button>
);

const STATUS_STYLE: Record<UgcVideoStatus, { label: string; className: string }> = {
  generating: { label: 'Working…', className: 'bg-surface-alt text-muted' },
  ready: { label: 'Ready', className: 'bg-emerald-50 text-emerald-700' },
  failed: { label: 'Failed', className: 'bg-red-50 text-red-700' },
};

export const StatusPill = ({ status }: { status: UgcVideoStatus }) => {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.generating;
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${style.className}`}>{style.label}</span>;
};

export const ErrorLine = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <p className="text-[13px] text-red-700">
    {message}
    {onRetry && (
      <>
        {' '}
        <button type="button" onClick={onRetry} className="underline">Retry</button>
      </>
    )}
  </p>
);

export const Notice = ({ children }: { children: ReactNode }) => (
  <div className="rounded-xl bg-amber-50 p-4 text-[13px] text-amber-800">{children}</div>
);

export const EmptyState = ({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line p-6 text-center">
    <p className="text-[13px] text-ink">{title}</p>
    {hint && <p className="text-[12px] text-muted">{hint}</p>}
    {action}
  </div>
);

export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded-xl bg-surface-alt ${className}`} />
);

export const MediaGridSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {Array.from({ length: count }, (_, i) => <Skeleton key={i} className="aspect-[9/16]" />)}
  </div>
);

export const Spinner = () => (
  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
);

export const usd = (value: number) => `$${value.toFixed(2)}`;

type FileButtonProps = { label: string; busyLabel: string; busy: boolean; onFile: (file: File) => void; primary?: boolean };

/** A file picker that looks like a button. Keyboard accessible through the native input. */
export const FileButton = ({ label, busyLabel, busy, onFile, primary = false }: FileButtonProps) => (
  <label
    className={`inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 transition-colors focus-within:ring-2 focus-within:ring-ink/20 ${
      primary
        ? 'rounded-xl bg-ink px-4 py-2 text-[13px] font-medium text-white hover:opacity-90'
        : 'rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-ink hover:bg-surface-alt'
    } ${busy ? 'pointer-events-none opacity-40' : ''}`}
  >
    {busy ? <><Spinner /> {busyLabel}</> : label}
    <input
      type="file"
      accept="image/jpeg,image/png,image/webp"
      className="sr-only"
      disabled={busy}
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onFile(file);
        e.target.value = '';
      }}
    />
  </label>
);
