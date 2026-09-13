export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

type BadgeProps = {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
};

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-app-sunken  text-app-muted',
  accent:  'bg-app-accent-soft text-app-accent',
  success: 'bg-green-50     text-app-success',
  warning: 'bg-amber-50     text-app-warning',
  danger:  'bg-red-50       text-app-danger',
  info:    'bg-blue-50      text-app-info',
};

export const Badge = ({ tone = 'neutral', className = '', children }: BadgeProps) => (
  <span
    className={[
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium label-caps',
      TONE_CLASSES[tone],
      className,
    ].join(' ')}
  >
    {children}
  </span>
);
