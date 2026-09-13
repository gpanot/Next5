import Link from 'next/link';
import { formatShortDate } from '../../../lib/dates';
import type { MeDto } from '../../../types/business/me';
import { Card, CardBody } from '../../ui/Card';
import { ProgressMeter } from '../../ui/ProgressMeter';

export const CreditsCard = ({ me }: { me: MeDto }) => {
  const monthly = me.subscription?.monthlyCredits ?? 0;
  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <p className="label-caps text-[10px] font-medium text-app-muted">{monthly ? 'This month' : 'Your photos'}</p>
          {me.subscription?.nextGrantAt && <p className="text-[12px] text-app-muted">Resets {formatShortDate(me.subscription.nextGrantAt)}</p>}
        </div>
        <p className="text-[36px] font-semibold leading-none tabular-nums text-app-ink">
          {me.balance.total + me.balance.trial}
          <span className="ml-2 text-[15px] font-normal text-app-muted">photos left</span>
        </p>
        {monthly > 0 && <ProgressMeter used={Math.max(0, monthly - me.balance.plan)} total={monthly} />}
        <div className="flex gap-3 text-[14px]">
          <Link href="/app/billing" className="font-medium text-app-accent hover:text-app-ink">{me.subscription ? 'Top up' : 'Choose a plan'}</Link>
          <Link href="/app/create" className="text-app-muted hover:text-app-ink">Create photos →</Link>
        </div>
      </CardBody>
    </Card>
  );
};
