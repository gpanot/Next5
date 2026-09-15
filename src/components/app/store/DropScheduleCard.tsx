'use client';

import { CalendarClock, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FORMATS, type FormatId } from '../../../config/formats';
import { PACKS, type PackId } from '../../../config/shots';
import { useApi } from '../../../hooks/useApi';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { formatShortDate } from '../../../lib/dates';
import type { StudioSetDto } from '../../../types/business/catalog';
import { AppButton } from '../../ui/AppButton';
import { Card, CardBody } from '../../ui/Card';
import { Checkbox } from '../../ui/Checkbox';
import { Field } from '../../ui/Field';
import { Select } from '../../ui/Select';
import { Switch } from '../../ui/Switch';
import { AppLink, useAppRouter } from '../shell/AppLink';

type Schedule = { active: boolean; cadence: 'weekly' | 'biweekly'; weekday: number; productsPerDrop: number; setId: string | null; packId: string; formats: string[]; nextRunAt: string | null; lastRunAt: string | null };
type DropsResponse = { allowed: boolean; pendingProductIds: string[]; schedule: Schedule | null };

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DEFAULTS: Schedule = { active: true, cadence: 'weekly', weekday: 1, productsPerDrop: 10, setId: null, packId: 'listing', formats: ['square_1_1', 'story_9_16'], nextRunAt: null, lastRunAt: null };

/** Weekly drops: we pick the products that need photos and email a drop to review. Growth and up. */
export const DropScheduleCard = () => {
  const router = useAppRouter();
  const { data, refresh } = useApi<DropsResponse>('/api/app/shop/drops');
  const sets = useApi<{ sets: StudioSetDto[] }>(data?.allowed ? '/api/app/sets?product=shop' : null);
  const [form, setForm] = useState<Schedule | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (data && !form) {
      const id = window.setTimeout(() => setForm(data.schedule ?? DEFAULTS), 0);
      return () => window.clearTimeout(id);
    }
  }, [data, form]);

  if (!data) return null;
  if (!data.allowed) {
    return (
      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-3 text-[14px] text-app-muted"><Lock aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /><span><span className="font-medium text-app-ink">Weekly drops</span> — every week we pick the new products that need photos and send you a drop to review. Included in Growth.</span></p>
          <AppButton variant="secondary" size="sm" onClick={() => router.push('/app/billing')}>See Growth</AppButton>
        </CardBody>
      </Card>
    );
  }
  if (!form) return null;

  const set = <K extends keyof Schedule>(key: K, value: Schedule[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));
  const toggleFormat = (id: FormatId, on: boolean) => set('formats', on ? [...new Set([...form.formats, id])] : form.formats.filter((f) => f !== id));
  const save = async (next: Schedule) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await apiFetch<DropsResponse>('/api/app/shop/drops', { method: 'PUT', json: next });
      setForm(res.schedule ?? next);
      setMessage(res.schedule?.active ? `Saved. Next drop: ${res.schedule.nextRunAt ? formatShortDate(res.schedule.nextRunAt) : 'soon'}.` : 'Weekly drops are off.');
      refresh();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardBody className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <CalendarClock aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
            <div>
              <p className="text-[16px] font-semibold text-app-ink">Weekly drops</p>
              <p className="mt-0.5 max-w-xl text-[14px] text-app-muted">We pick the products that need photos (new stock first, then best sellers) and email you a drop to review. Nothing is made until you say so.</p>
            </div>
          </div>
          <Switch checked={form.active} onChange={(on) => void save({ ...form, active: on })} label="Weekly drops on" />
        </div>
        {data.pendingProductIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-app-accent-soft px-4 py-3 text-[14px] text-app-ink">
            <span>Your latest drop: <strong>{data.pendingProductIds.length} products</strong> still need photos.</span>
            <AppLink href={`/app/create?${new URLSearchParams({ products: data.pendingProductIds.join(','), pack: form.packId, formats: form.formats.join(','), ...(form.setId ? { set: form.setId } : {}) }).toString()}`} className="font-medium text-app-accent hover:text-app-ink">Review drop →</AppLink>
          </div>
        )}
        {form.active && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="How often" htmlFor="drop-cadence"><Select id="drop-cadence" value={form.cadence} onChange={(e) => set('cadence', e.target.value as Schedule['cadence'])}><option value="weekly">Every week</option><option value="biweekly">Every 2 weeks</option></Select></Field>
            <Field label="Day" htmlFor="drop-day"><Select id="drop-day" value={form.weekday} onChange={(e) => set('weekday', Number(e.target.value))}>{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</Select></Field>
            <Field label="Products per drop" htmlFor="drop-count"><Select id="drop-count" value={form.productsPerDrop} onChange={(e) => set('productsPerDrop', Number(e.target.value))}>{[5, 10, 20, 40].map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
            <Field label="Shop look" htmlFor="drop-set"><Select id="drop-set" value={form.setId ?? ''} onChange={(e) => set('setId', e.target.value || null)}><option value="">Latest look</option>{(sets.data?.sets ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
            <Field label="Shots" htmlFor="drop-pack"><Select id="drop-pack" value={form.packId} onChange={(e) => set('packId', e.target.value as PackId)}>{(['listing', 'full'] as const).map((p) => <option key={p} value={p}>{PACKS[p].label} · {PACKS[p].shots.length} shots</option>)}</Select></Field>
            <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
              <p className="text-[13px] font-medium text-app-ink">Sizes</p>
              <div className="flex flex-wrap gap-4">
                {(['square_1_1', 'story_9_16', 'portrait_4_5'] as const).map((id) => <Checkbox key={id} checked={form.formats.includes(id)} onChange={(on) => toggleFormat(id, on)} label={`${FORMATS[id].ratio} ${FORMATS[id].label}`} />)}
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {form.active && <AppButton size="sm" loading={busy} onClick={() => void save(form)}>Save schedule</AppButton>}
          {message && <p role="status" className="text-[13px] text-app-muted">{message}</p>}
          {!message && data.schedule?.nextRunAt && form.active && <p className="text-[13px] text-app-muted">Next drop: {formatShortDate(data.schedule.nextRunAt)}</p>}
        </div>
      </CardBody>
    </Card>
  );
};
