'use client';

import { useState } from 'react';
import type { PhotoRoute } from '../../../data/routes';
import { formatLongDate } from '../../../lib/date';
import { formatVnd } from '../../../lib/format';
import type { CustomerDetails, Photographer, TimeSlot } from '../../../types/booking';
import { Button } from '../../ui/Button';
import { ChevronDownIcon } from '../../ui/Icons';
import { BookingSummary } from '../ui/BookingSummary';
import { Field } from '../ui/Field';
import { StepFooter } from '../ui/StepFooter';
import { StepHeading } from '../ui/StepHeading';

type CheckoutStepProps = {
  route: PhotoRoute;
  photographer: Photographer;
  date: string;
  slot: TimeSlot;
  details: CustomerDetails;
  onChange: (details: CustomerDetails) => void;
  onSubmit: () => void;
};

type Errors = Partial<Record<keyof CustomerDetails, string>>;

const validate = ({ name, email, phone }: CustomerDetails): Errors => {
  const errors: Errors = {};
  if (name.trim().length < 2) errors.name = 'Please tell us your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) errors.email = 'Please enter a valid email.';
  if (phone.replace(/\D/g, '').length < 8) errors.phone = 'Please enter a valid phone number.';
  return errors;
};

export const CheckoutStep = ({
  route,
  photographer,
  date,
  slot,
  details,
  onChange,
  onSubmit,
}: CheckoutStepProps) => {
  const [showErrors, setShowErrors] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const errors = validate(details);
  const visible: Errors = showErrors ? errors : {};

  const handleSubmit = () => {
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      return;
    }
    onSubmit();
  };

  const update = (key: keyof CustomerDetails) => (value: string) =>
    onChange({ ...details, [key]: value });

  return (
    <section>
      <StepHeading eyebrow="Almost yours" title="Your shoot" />

      {/* ── Desktop: side-by-side ─────────────────────────────────── */}
      <div className="mt-6 hidden lg:grid lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-10">
        <BookingSummary route={route} photographer={photographer} date={date} slot={slot} />
        <DetailsForm
          details={details}
          visible={visible}
          update={update}
          onSubmit={handleSubmit}
        />
      </div>

      {/* ── Mobile: compact summary banner + form ────────────────── */}
      <div className="mt-4 lg:hidden">
        {/* Collapsible summary pill */}
        <button
          type="button"
          onClick={() => setSummaryOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-alt"
          aria-expanded={summaryOpen}
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-serif text-[13px] tracking-[0.07em] uppercase text-ink">
              {route.title}
            </span>
            <span className="text-[11.5px] text-muted">
              {formatLongDate(date)} · {slot.label} · {photographer.name}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-serif text-[15px] text-gold">{formatVnd(route.priceVnd)} VND</span>
            <ChevronDownIcon
              className={`h-4 w-4 text-muted transition-transform duration-200 ${summaryOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {/* Expanded summary */}
        {summaryOpen && (
          <div className="mt-2 pb-2">
            <BookingSummary route={route} photographer={photographer} date={date} slot={slot} />
          </div>
        )}

        {/* Form — always visible on mobile */}
        <div className="mt-5">
          <DetailsForm
            details={details}
            visible={visible}
            update={update}
            onSubmit={handleSubmit}
          />
        </div>
      </div>

      <StepFooter aside="Secure bank transfer via SEPAY. No card needed.">
        <Button onClick={handleSubmit} variant="dark" size="lg" withArrow fullWidth className="sm:w-auto">
          Continue to payment
        </Button>
      </StepFooter>
    </section>
  );
};

/* ── Extracted form to avoid duplication ───────────────────────────── */
type DetailsFormProps = {
  details: CustomerDetails;
  visible: Errors;
  update: (key: keyof CustomerDetails) => (value: string) => void;
  onSubmit: () => void;
};

const DetailsForm = ({ details, visible, update, onSubmit }: DetailsFormProps) => (
  <form
    noValidate
    onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
  >
    <h3 className="label-caps text-[9.5px] font-medium text-muted">Your details</h3>

    <div className="mt-4 space-y-4">
      <Field
        id="booking-name"
        label="Full name"
        autoComplete="name"
        placeholder="Nguyen Thi Linh"
        value={details.name}
        error={visible.name}
        onChange={(e) => update('name')(e.target.value)}
      />
      <Field
        id="booking-email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@email.com"
        value={details.email}
        error={visible.email}
        onChange={(e) => update('email')(e.target.value)}
      />
      <Field
        id="booking-phone"
        label="Phone"
        type="tel"
        autoComplete="tel"
        placeholder="+84 90 123 4567"
        value={details.phone}
        error={visible.phone}
        onChange={(e) => update('phone')(e.target.value)}
      />
    </div>

    <p className="mt-4 text-[11.5px] leading-relaxed text-muted">
      We use these only to confirm your shoot and send your photos. Meeting point details arrive the day before.
    </p>

    <button type="submit" className="sr-only">Continue to payment</button>
  </form>
);
