'use client';

import { MailCheck } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { onboardingDraftStore, sessionTokenStore } from '../../../lib/localStore';
import type { ProductLineDto } from '../../../types/business/me';
import { AppButton } from '../../ui/AppButton';
import { Field } from '../../ui/Field';
import { SkeletonText } from '../../ui/Skeleton';
import { TextInput } from '../../ui/TextInput';
import { StepCard } from './StepCard';

type AccountResponse = { status: 'session'; token: string } | { status: 'check_email' };
type Profile = { firstName: string; handle: string };
type Draft = Profile & { product: ProductLineDto };

export type SignedInUser = { email: string; displayName: string | null };

type AccountStepProps = {
  product: ProductLineDto;
  /** Set when the visitor already has a session (e.g. back from a magic link) but no workspace for this product. */
  signedIn: SignedInUser | null;
  /** The magic link in the URL was expired or already used. */
  linkFailed: boolean;
  /** Signed in with another studio already: create this one from that profile, no form. */
  hasOtherStudio: boolean;
  onSession: () => void;
};

const readDraft = (raw: string | null | undefined, product: ProductLineDto): Draft | null => {
  try {
    const draft = raw ? (JSON.parse(raw) as Draft) : null;
    return draft?.product === product && draft.firstName ? draft : null;
  } catch {
    return null;
  }
};

const profileBody = (product: ProductLineDto, p: Profile) => ({ product, firstName: p.firstName, handle: p.handle });

const FIELD_ERRORS = ['invalid_email', 'first_name_required'];

export const AccountStep = ({ product, signedIn, linkFailed, hasOtherStudio, onSession }: AccountStepProps) => {
  const draft = readDraft(onboardingDraftStore.useValue(), product);
  const [form, setForm] = useState({ email: '', firstName: draft?.firstName ?? signedIn?.displayName ?? '', handle: draft?.handle ?? '' });
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [autoFailed, setAutoFailed] = useState(false);
  const autoStarted = useRef(false);
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  // Back from the email link with the details already typed, or adding a second studio: finish setup without asking again.
  const autoCreate = Boolean(signedIn && (draft || hasOtherStudio)) && !autoFailed;
  useEffect(() => {
    if (!autoCreate || autoStarted.current) return;
    autoStarted.current = true;
    apiFetch('/api/app/onboarding/workspace', { method: 'POST', json: draft ? profileBody(product, draft) : { product, fromExisting: true } })
      .then(() => onSession())
      .catch(() => setAutoFailed(true));
  }, [autoCreate, draft, product, onSession]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (signedIn) {
        await apiFetch('/api/app/onboarding/workspace', { method: 'POST', json: profileBody(product, form) });
        onSession();
        return;
      }
      onboardingDraftStore.set(JSON.stringify({ product, firstName: form.firstName, handle: form.handle } satisfies Draft));
      const res = await apiFetch<AccountResponse>('/api/app/onboarding/account', { method: 'POST', json: { ...profileBody(product, form), email: form.email } });
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

  if (autoCreate) {
    return (
      <StepCard title={hasOtherStudio ? `Adding ${product === 'brand' ? 'Brand' : 'Shop'} Studio\u2026` : 'Setting up your studio\u2026'} sub="Welcome back. This takes a second.">
        <SkeletonText lines={3} />
      </StepCard>
    );
  }

  if (checkEmail) {
    return (
      <StepCard title="Check your inbox" sub={`This email already has a Next5 account. We sent a secure link to ${form.email}. Open it on this device to finish setup \u2014 you won't need to fill this in again.`}>
        <MailCheck aria-hidden className="h-10 w-10 text-app-accent" />
      </StepCard>
    );
  }

  const isBrand = product === 'brand';
  return (
    <form onSubmit={submit}>
      <StepCard
        title={isBrand ? "Let\u2019s set up your Brand Studio" : "Let\u2019s set up your Shop Studio"}
        sub="Takes about 3 minutes. No card needed."
        footer={<AppButton type="submit" size="lg" loading={busy}>Continue</AppButton>}
      >
        {linkFailed && !signedIn && <p role="alert" className="rounded-xl bg-app-sunken px-4 py-3 text-[14px] text-app-ink">That link has expired or was already used. Enter your email again and we'll send a new one.</p>}
        {signedIn && (
          <p className="text-[14px] text-app-muted">
            Signed in as <span className="font-medium text-app-ink">{signedIn.email}</span>.{' '}
            <button type="button" className="font-medium text-app-accent underline" onClick={() => sessionTokenStore.set(null)}>Not you?</button>
          </p>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          {!signedIn && (
            <Field label="Email" htmlFor="ob-email" required error={error?.field === 'invalid_email' ? error.message : undefined}>
              <TextInput id="ob-email" type="email" autoComplete="email" required value={form.email} onChange={(e) => set('email')(e.target.value)} />
            </Field>
          )}
          <Field label="First name" htmlFor="ob-first" required error={error?.field === 'first_name_required' ? error.message : undefined}>
            <TextInput id="ob-first" autoComplete="given-name" required value={form.firstName} onChange={(e) => set('firstName')(e.target.value)} />
          </Field>
          <Field label="Instagram, TikTok or Facebook" htmlFor="ob-handle" helper="Optional">
            <TextInput id="ob-handle" value={form.handle} onChange={(e) => set('handle')(e.target.value)} placeholder="@yourbusiness" />
          </Field>
        </div>
        {error && !FIELD_ERRORS.includes(error.field ?? '') && <p role="alert" className="text-[14px] text-app-danger">{error.message}</p>}
      </StepCard>
    </form>
  );
};
