'use client';

import { MailCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { INDUSTRIES, SHOP_CATEGORIES } from '../../../content/business/catalog/types';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { sessionTokenStore } from '../../../lib/localStore';
import type { ProductLineDto } from '../../../types/business/me';
import { AppButton } from '../../ui/AppButton';
import { ChipGroup } from '../../ui/Chip';
import { Field } from '../../ui/Field';
import { TextInput } from '../../ui/TextInput';
import { StepCard } from './StepCard';

type AccountResponse = { status: 'session'; token: string } | { status: 'check_email' };

export const AccountStep = ({ product, onSession }: { product: ProductLineDto; onSession: () => void }) => {
  const [form, setForm] = useState({ email: '', firstName: '', businessName: '', industry: '', handle: '' });
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<AccountResponse>('/api/app/onboarding/account', { method: 'POST', json: { product, ...form, industryOrCategory: form.industry } });
      if (res.status === 'session') {
        sessionTokenStore.set(res.token);
        onSession();
      } else setCheckEmail(true);
    } catch (err) {
      setError({ field: err instanceof ApiError ? err.code : undefined, message: err instanceof ApiError ? err.message : 'Something went wrong. Try again.' });
    } finally {
      setBusy(false);
    }
  };

  if (checkEmail) {
    return (
      <StepCard title="Check your inbox" sub={`You already have a Next5 account. We sent a secure link to ${form.email} to continue setup.`}>
        <MailCheck aria-hidden className="h-10 w-10 text-app-accent" />
      </StepCard>
    );
  }

  const isBrand = product === 'brand';
  const options = isBrand ? INDUSTRIES : SHOP_CATEGORIES;
  return (
    <form onSubmit={submit}>
      <StepCard
        title={isBrand ? 'Let’s set up your Brand Studio' : 'Let’s set up your Shop Studio'}
        sub="Takes about 3 minutes. Your first photos are free — no payment details needed."
        footer={<AppButton type="submit" size="lg" loading={busy}>Continue</AppButton>}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Email" htmlFor="ob-email" required error={error?.field === 'invalid_email' ? error.message : undefined}>
            <TextInput id="ob-email" type="email" autoComplete="email" required value={form.email} onChange={(e) => set('email')(e.target.value)} />
          </Field>
          <Field label="First name" htmlFor="ob-first" required error={error?.field === 'first_name_required' ? error.message : undefined}>
            <TextInput id="ob-first" autoComplete="given-name" required value={form.firstName} onChange={(e) => set('firstName')(e.target.value)} />
          </Field>
          <Field label={isBrand ? 'Business name' : 'Shop name'} htmlFor="ob-biz" required error={error?.field === 'business_required' ? error.message : undefined}>
            <TextInput id="ob-biz" required value={form.businessName} onChange={(e) => set('businessName')(e.target.value)} placeholder={isBrand ? 'Linh Realty' : 'Linh Closet'} />
          </Field>
          <Field label="Instagram, TikTok or Facebook" htmlFor="ob-handle" helper="Optional">
            <TextInput id="ob-handle" value={form.handle} onChange={(e) => set('handle')(e.target.value)} placeholder="@yourbusiness" />
          </Field>
          <Field label={isBrand ? 'What do you do?' : 'What do you sell?'} className="sm:col-span-2">
            <ChipGroup options={options.map((o) => ({ value: o.id, label: o.label }))} value={form.industry} onChange={(v) => set('industry')(String(v))} />
          </Field>
        </div>
        {error && !['invalid_email', 'first_name_required', 'business_required'].includes(error.field ?? '') && <p role="alert" className="text-[14px] text-app-danger">{error.message}</p>}
      </StepCard>
    </form>
  );
};
