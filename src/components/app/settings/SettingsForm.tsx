'use client';

import { AppLink as Link } from '../shell/AppLink';
import { useState, type FormEvent } from 'react';
import { useToast } from '../../../hooks/useToast';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { MeDto } from '../../../types/business/me';
import { AppButton } from '../../ui/AppButton';
import { Card, CardBody } from '../../ui/Card';
import { Field } from '../../ui/Field';
import { TextInput } from '../../ui/TextInput';
import { ToastContainer } from '../../ui/Toast';

type SettingsFormProps = { me: MeDto & { workspace: NonNullable<MeDto['workspace']> }; onSaved: () => void };

export const SettingsForm = ({ me, onSaved }: SettingsFormProps) => {
  const ws = me.workspace;
  const [displayName, setDisplayName] = useState(me.user.displayName ?? '');
  const [name, setName] = useState(ws.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toasts, toast, dismiss } = useToast();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/app/workspaces', {
        method: 'PATCH',
        json: { product: ws.product, displayName, name },
      });
      toast('Settings saved');
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <Card>
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <p className="text-[16px] font-semibold text-app-ink sm:col-span-2">Profile & business</p>
          <Field label="Your first name" htmlFor="set-name"><TextInput id="set-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></Field>
          <Field label="Email" htmlFor="set-email" helper="Contact us to change your email."><TextInput id="set-email" value={me.user.email} disabled /></Field>
          <Field label={ws.product === 'brand' ? 'Business name' : 'Shop name'} htmlFor="set-biz" required error={error ?? undefined}><TextInput id="set-biz" value={name} onChange={(e) => setName(e.target.value)} required /></Field>
          <p className="text-[14px] text-app-muted sm:col-span-2">Your selfies and face data: <Link href="/app/settings/privacy" className="font-medium text-app-accent hover:text-app-ink">Privacy settings</Link></p>
        </CardBody>
      </Card>
      <div className="flex justify-end"><AppButton type="submit" size="lg" loading={saving}>Save changes</AppButton></div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </form>
  );
};
