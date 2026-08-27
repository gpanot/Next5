import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { ArrowRightIcon } from './Icons';

type ButtonVariant = 'accent' | 'dark' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

type SharedProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  withArrow?: boolean;
  fullWidth?: boolean;
  rounded?: 'full' | 'lg';
};

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & SharedProps;
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & SharedProps;

const variantStyles: Record<ButtonVariant, string> = {
  accent: 'bg-accent text-white hover:bg-accent-strong',
  dark: 'bg-ink-block text-on-dark hover:bg-ink-block/85',
  outline: 'border border-white/45 text-white hover:border-white hover:bg-white/10',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2.5 text-[10px]',
  md: 'px-6 py-3 text-[11px]',
  lg: 'px-8 py-4 text-xs sm:px-9 sm:py-4.5',
};

const buttonClasses = ({
  variant = 'accent',
  size = 'md',
  fullWidth = false,
  rounded = 'full',
  className = '',
}: Pick<SharedProps, 'variant' | 'size' | 'fullWidth' | 'rounded'> & { className?: string }) =>
  [
    'label-caps group inline-flex items-center justify-center gap-2.5 font-medium',
    'transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    'disabled:cursor-not-allowed disabled:opacity-45',
    rounded === 'full' ? 'rounded-full' : 'rounded-lg',
    fullWidth ? 'w-full' : '',
    variantStyles[variant],
    sizeStyles[size],
    className,
  ].join(' ');

export const ButtonLink = ({
  children,
  variant,
  size,
  withArrow = false,
  fullWidth,
  rounded,
  className,
  ...props
}: ButtonLinkProps) => (
  <a className={buttonClasses({ variant, size, fullWidth, rounded, className })} {...props}>
    {children}
    {withArrow && <Arrow />}
  </a>
);

export const Button = ({
  children,
  variant,
  size,
  withArrow = false,
  fullWidth,
  rounded,
  className,
  type = 'button',
  ...props
}: ButtonProps) => (
  <button
    type={type}
    className={buttonClasses({ variant, size, fullWidth, rounded, className })}
    {...props}
  >
    {children}
    {withArrow && <Arrow />}
  </button>
);

const Arrow = () => (
  <ArrowRightIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
);
