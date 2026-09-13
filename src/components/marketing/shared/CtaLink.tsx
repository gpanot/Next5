import Link from 'next/link';
import type { ReactNode } from 'react';

type CtaLinkProps = {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'inverse';
  size?: 'md' | 'lg';
  className?: string;
};

const VARIANTS = {
  primary: 'bg-app-accent text-app-accent-ink hover:opacity-90 shadow-sm',
  secondary: 'border border-app-line bg-app-panel text-app-ink hover:bg-app-sunken',
  ghost: 'text-app-ink hover:bg-app-sunken',
  inverse: 'bg-white text-[#1f1c19] hover:bg-white/90',
} as const;

const SIZES = { md: 'h-10 px-4 text-[13px]', lg: 'h-12 px-6 text-[15px]' } as const;

/** A link styled as a button — for marketing CTAs that navigate. */
export const CtaLink = ({ href, children, variant = 'primary', size = 'lg', className = '' }: CtaLinkProps) => (
  <Link
    href={href}
    className={[
      'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg',
      VARIANTS[variant],
      SIZES[size],
      className,
    ].join(' ')}
  >
    {children}
  </Link>
);
