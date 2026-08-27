import type { PaymentStatus } from '../types/booking';

export type PaymentIntentInput = {
  bookingId: string;
  amountVnd: number;
  routeTitle: string;
};

export type BankAccount = {
  bank: string;
  accountNumber: string;
  accountHolder: string;
};

export type PaymentIntent = {
  reference: string;
  amountVnd: number;
  qrImageUrl: string | null;
  bankAccount: BankAccount | null;
  isMock: boolean;
};

export type PaymentEvent = {
  status: PaymentStatus;
};

export type PaymentService = {
  createIntent: (input: PaymentIntentInput) => Promise<PaymentIntent>;
  watch: (reference: string, onEvent: (event: PaymentEvent) => void) => () => void;
  simulateTransfer?: (reference: string) => void;
};

const MOCK_TRANSFER_DELAY_MS = 7_000;
const MOCK_CONFIRM_DELAY_MS = 2_200;

const createMockSepayService = (): PaymentService => {
  const listeners = new Map<string, (event: PaymentEvent) => void>();
  const timers = new Map<string, number[]>();

  const clear = (reference: string) => {
    timers.get(reference)?.forEach((id) => window.clearTimeout(id));
    timers.delete(reference);
  };

  const confirm = (reference: string) => {
    const notify = listeners.get(reference);
    if (!notify) return;

    clear(reference);
    notify({ status: 'paid' });
    timers.set(reference, [
      window.setTimeout(() => notify({ status: 'confirmed' }), MOCK_CONFIRM_DELAY_MS),
    ]);
  };

  return {
    createIntent: async ({ bookingId, amountVnd }) =>
      new Promise((resolve) => {
        window.setTimeout(
          () =>
            resolve({
              reference: `NEXT5${bookingId.replace('-', '')}`,
              amountVnd,
              qrImageUrl: null,
              bankAccount: null,
              isMock: true,
            }),
          600,
        );
      }),

    watch: (reference, onEvent) => {
      listeners.set(reference, onEvent);
      onEvent({ status: 'pending' });

      timers.set(reference, [
        window.setTimeout(() => confirm(reference), MOCK_TRANSFER_DELAY_MS),
      ]);

      return () => {
        clear(reference);
        listeners.delete(reference);
      };
    },

    simulateTransfer: confirm,
  };
};

export const paymentService: PaymentService = createMockSepayService();
