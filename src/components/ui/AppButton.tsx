'use client';

import { Loader2 } from 'lucide-react';

export type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type AppButtonSize = 'sm' | 'md' | 'lg';

export type AppButtonProps = {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const VARIANT_CLASSES: Record<AppButtonVariant, string> = {
  primary:   'bg-app-cta text-app-cta-ink hover:opacity-90',
  secondary: 'bg-app-panel text-app-ink border border-app-line hover:bg-app-sunken',
  ghost:     'text-app-ink hover:bg-app-sunken',
  danger:    'bg-app-danger text-white hover:opacity-90',
};

const SIZE_CLASSES: Record<AppButtonSize, string> = {
  sm: 'h-8  px-3   text-[12px] gap-1.5 rounded-lg',
  md: 'h-10 px-4   text-[13px] gap-2   rounded-xl',
  lg: 'h-12 px-5   text-[14px] gap-2   rounded-xl',
};

export const AppButton = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...rest
}: AppButtonProps) => {
  const isDisabled = disabled || loading;

  return (
    <button
      {...rest}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center font-medium transition-colors duration-200',
        'focus-visible:ring-2 focus-visible:ring-app-cta focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {loading
        ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        : iconLeft && <span aria-hidden="true">{iconLeft}</span>
      }
      {children}
      {!loading && iconRight && <span aria-hidden="true">{iconRight}</span>}
    </button>
  );
};
