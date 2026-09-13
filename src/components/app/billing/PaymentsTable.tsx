import { formatShortDate } from '../../../lib/dates';
import { formatUsd, formatVnd } from '../../../lib/money';
import type { PaymentDto } from '../../../types/business/payments';
import { AppButton } from '../../ui/AppButton';
import { Badge, type BadgeTone } from '../../ui/Badge';

const TONE: Record<PaymentDto['state'], BadgeTone> = { paid: 'success', pending: 'info', underpaid: 'danger', expired: 'neutral', refunded: 'neutral' };
const LABEL: Record<PaymentDto['state'], string> = { paid: 'Paid', pending: 'Waiting', underpaid: 'Underpaid', expired: 'Expired', refunded: 'Refunded' };

export const PaymentsTable = ({ payments, onResume }: { payments: PaymentDto[]; onResume: (p: PaymentDto) => void }) => (
  <ul className="divide-y divide-app-line rounded-2xl border border-app-line bg-app-panel">
    {payments.map((p) => (
      <li key={p.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 p-4 sm:grid-cols-[110px_1fr_110px_100px_auto]">
        <span className="text-[13px] text-app-muted sm:order-none">{formatShortDate(p.createdAt)}</span>
        <span className="order-first col-span-2 text-[14px] font-medium text-app-ink sm:order-none sm:col-span-1">{p.itemLabel}</span>
        <span className="text-[13px] tabular-nums text-app-ink">
          {p.amountUsdCents !== null ? formatUsd(p.amountUsdCents, { showCents: true }) : formatVnd(p.amountVnd)}
          <span className="block text-[11px] text-app-muted">{formatVnd(p.amountVnd)} · {p.reference}</span>
        </span>
        <span><Badge tone={TONE[p.state]}>{LABEL[p.state]}</Badge></span>
        <span className="text-right">{p.state === 'pending' && <AppButton size="sm" variant="secondary" onClick={() => onResume(p)}>Resume</AppButton>}</span>
      </li>
    ))}
  </ul>
);
