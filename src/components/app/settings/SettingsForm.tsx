'use client';

import { AppLink as Link } from '../shell/AppLink';
import { useState, type FormEvent } from 'react';
import { FORMAT_IDS, FORMATS, type FormatId } from '../../../config/formats';
import { INDUSTRIES, SHOP_CATEGORIES } from '../../../content/business/catalog/types';
import { useToast } from '../../../hooks/useToast';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { MeDto } from '../../../types/business/me';
import { AppButton } from '../../ui/AppButton';
import { Card, CardBody } from '../../ui/Card';
import { ChipGroup } from '../../ui/Chip';
import { ColorInput } from '../../ui/ColorInput';
import { Field } from '../../ui/Field';
import { Select } from '../../ui/Select';
import { Switch } from '../../ui/Switch';
import { TextInput } from '../../ui/TextInput';
import { ToastContainer } from '../../ui/Toast';

type SettingsFormProps = { me: MeDto & { workspace: NonNullable<MeDto['workspace']> }; onSaved: () => void };

export const SettingsForm = ({ me, onSaved }: SettingsFormProps) => {
  const ws = me.workspace;
  const [displayName, setDisplayName] = useState(me.user.displayName ?? '');
  const [name, setName] = useState(ws.name);
  const [handle, setHandle] = useState(ws.handle ?? '');
  const [industry, setIndustry] = useState(ws.industry ?? '');
  const [colors, setColors] = useState<string[]>(ws.brandColors);
  const [visibleAiTag, setVisibleAiTag] = useState(ws.visibleAiTag);
  const [formats, setFormats] = useState<FormatId[]>(ws.defaultFormats.filter((f): f is FormatId => f in FORMATS));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toasts, toast, dismiss } = useToast();
  const options = ws.product === 'brand' ? INDUSTRIES : SHOP_CATEGORIES;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/app/workspaces', {
        method: 'PATCH',
        json: { product: ws.product, displayName, name, handle, industry, brandColors: colors, visibleAiTag, defaultFormats: formats },
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
          <Field label="Instagram, TikTok or Facebook handle" htmlFor="set-handle"><TextInput id="set-handle" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@yourbusiness" /></Field>
          <Field label={ws.product === 'brand' ? 'Industry' : 'Category'} htmlFor="set-industry">
            <Select id="set-industry" value={industry} onChange={(e) => setIndustry(e.target.value)}>
              <option value="">Choose…</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </Select>
          </Field>
          {ws.product === 'brand' && (
            <Field label="Brand colours" helper="Used as subtle accents in your photos.">
              <div className="flex gap-4">
                {[0, 1].map((i) => (
                  <ColorInput key={i} label={`Brand colour ${i + 1}`} value={colors[i] ?? '#8e2a5c'} onChange={(v) => setColors((prev) => { const next = [...prev]; next[i] = v; return next.slice(0, 2); })} />
                ))}
              </div>
            </Field>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardBody className="flex flex-col gap-5">
          <p className="text-[16px] font-semibold text-app-ink">Photos</p>
          <Switch checked={visibleAiTag} onChange={setVisibleAiTag} label="Add a small visible “AI” tag to new photos" />
          <Field label="Default formats" helper="Pre-selected when you create a batch.">
            <ChipGroup multi options={FORMAT_IDS.map((id) => ({ value: id, label: `${FORMATS[id].ratio} ${FORMATS[id].label}` }))} value={formats} onChange={(v) => setFormats((Array.isArray(v) ? v : [v]) as FormatId[])} />
          </Field>
          <p className="text-[14px] text-app-muted">Your selfies and face data: <Link href="/app/settings/privacy" className="font-medium text-app-accent hover:text-app-ink">Privacy settings</Link></p>
        </CardBody>
      </Card>
      <div className="flex justify-end"><AppButton type="submit" size="lg" loading={saving}>Save changes</AppButton></div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </form>
  );
};
