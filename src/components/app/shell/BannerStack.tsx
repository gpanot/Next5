'use client';

import { AlertTriangle, CalendarClock, Sparkles } from 'lucide-react';
import { AppLink as Link } from './AppLink';
import { formatShortDate } from '../../../lib/dates';
import type { BannerDto } from '../../../types/business/me';
import { useWorkspace } from './WorkspaceProvider';

const content = (banner: BannerDto): { tone: 'warning' | 'danger' | 'accent'; text: string; cta: string } => {
  switch (banner.type) {
    case 'payment_underpaid':
      return { tone: 'danger', text: 'We received less than the amount due for your last payment.', cta: 'View payment' };
    case 'plan_ended':
      return { tone: 'warning', text: `Your plan ended on ${formatShortDate(banner.endedAt)}. Your library stays available for 90 days.`, cta: 'Renew' };
    case 'renewal_due':
      return { tone: 'warning', text: `Your plan ends on ${formatShortDate(banner.endsAt)}. Renew now to keep your monthly photos.`, cta: 'Renew' };
    case 'low_credits':
      return { tone: 'warning', text: `You have ${banner.remaining} photos left this month.`, cta: 'Top up' };
    case 'trial_no_plan':
      return { tone: 'accent', text: 'Your free photos are ready. Like them? Pick a plan to keep going.', cta: 'See plans' };
  }
};

const TONES = {
  warning: 'border-app-warning/30 bg-app-warning/10 text-app-ink',
  danger: 'border-app-danger/30 bg-app-danger/10 text-app-ink',
  accent: 'border-app-accent/30 bg-app-accent-soft text-app-ink',
} as const;

export const BannerStack = () => {
  const { me } = useWorkspace();
  const banner = me?.banners[0];
  if (!banner) return null;
  const { tone, text, cta } = content(banner);
  const Icon = tone === 'accent' ? Sparkles : tone === 'danger' ? AlertTriangle : CalendarClock;
  return (
    <div role="status" className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-[14px] ${TONES[tone]}`}>
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
      <p className="flex-1">{text}</p>
      <Link href="/app/billing" className="font-medium text-app-accent hover:text-app-ink">{cta}</Link>
    </div>
  );
};
