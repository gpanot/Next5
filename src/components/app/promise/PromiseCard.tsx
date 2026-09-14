'use client';

import { Trophy } from 'lucide-react';
import { useState } from 'react';
import { PROMISE } from '../../../config/promise';
import { useApi } from '../../../hooks/useApi';
import { formatShortDate } from '../../../lib/dates';
import { AppButton } from '../../ui/AppButton';
import { Card, CardBody } from '../../ui/Card';
import { Dialog } from '../../ui/Dialog';
import { PromiseClaimForm } from './PromiseClaimForm';

type Status = { eligible: boolean; reason: 'no_plan' | 'too_early' | 'cooldown' | null; eligibleFrom: string | null; lastClaim: { status: string; outcome: string; createdAt: string } | null };

const statusLine = (s: Status): string => {
  if (s.eligible) return 'Your first 30 days are up. Compare your posts and tell us how it went.';
  if (s.reason === 'no_plan') return 'The promise starts when you pick a paid plan.';
  if (s.reason === 'too_early') return `Post ${PROMISE.postsRequired} Next5 photos. You can check your results on ${formatShortDate(s.eligibleFrom ?? '')}.`;
  return `Thanks for sending your results. You can send new ones on ${formatShortDate(s.eligibleFrom ?? '')}.`;
};

/** Beat-your-feed promise: status and claim. */
export const PromiseCard = ({ product }: { product: 'brand' | 'shop' }) => {
  const status = useApi<Status>(`/api/app/promise?product=${product}`);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!status.data) return null;

  return (
    <Card>
      <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <Trophy aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
          <div>
            <p className="text-[16px] font-semibold text-app-ink">Beat-your-feed promise</p>
            <p className="mt-1 max-w-xl text-[14px] text-app-muted">
              Post {PROMISE.postsRequired} Next5 photos in {PROMISE.windowDays} days. If they don’t beat your last {PROMISE.postsRequired} posts, your next month is free.
            </p>
            <p className="mt-2 text-[13px] text-app-ink">{message ?? statusLine(status.data)}</p>
          </div>
        </div>
        {status.data.eligible && !message && <AppButton onClick={() => setOpen(true)}>Check my results</AppButton>}
      </CardBody>
      <Dialog open={open} onClose={() => setOpen(false)} title="Check your results" description="Open your app’s stats. Compare your Next5 posts with your posts before.">
        <PromiseClaimForm
          product={product}
          onDone={(result) => {
            setOpen(false);
            setMessage(result.outcome === 'won' ? 'Your Next5 posts did better. Nice work! Keep going.' : 'Your free month is on its way. We will check and add it within 2 days.');
            status.refresh();
          }}
        />
      </Dialog>
    </Card>
  );
};
