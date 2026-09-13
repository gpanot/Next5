// server-only — never import from a 'use client' file.

import type { Payment } from '@prisma/client';
import type { PaymentDto } from '../../types/business/payments';
import { bankDetails, isMockPaymentsEnabled } from './mockProvider';
import { describePaymentItem } from './payments';

export const toPaymentDto = (payment: Payment): PaymentDto => ({
  id: payment.id,
  purpose: payment.purpose,
  state: payment.state,
  itemLabel: describePaymentItem(payment),
  reference: payment.reference,
  amountUsdCents: payment.amountUsdCents,
  amountVnd: payment.amountVnd,
  paidVnd: payment.paidVnd,
  fxVndPerUsd: payment.fxVndPerUsd,
  expiresAt: payment.expiresAt.toISOString(),
  paidAt: payment.paidAt?.toISOString() ?? null,
  createdAt: payment.createdAt.toISOString(),
  qrImageUrl: null,
  bank: payment.provider === 'request' ? null : bankDetails(),
  isRequest: payment.provider === 'request',
  canSimulate: payment.provider === 'mock' && isMockPaymentsEnabled(),
});
