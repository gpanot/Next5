'use client';

import { useState } from 'react';
import { PROMISE, type PromiseMetric, type PromisePlatform } from '../../../config/promise';
import { track } from '../../../lib/analytics';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { AppButton } from '../../ui/AppButton';
import { Checkbox } from '../../ui/Checkbox';
import { Field } from '../../ui/Field';
import { Select } from '../../ui/Select';
import { TextInput } from '../../ui/TextInput';
import { Textarea } from '../../ui/Textarea';

type Result = { outcome: 'won' | 'missed'; status: string };

const PLATFORM_LABEL: Record<PromisePlatform, string> = { instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook', shopee: 'Shopee', other: 'Other' };

/** Self-reported before/after averages. Wins become testimonial leads; misses become a free month for admin review. */
export const PromiseClaimForm = ({ product, onDone }: { product: 'brand' | 'shop'; onDone: (result: Result) => void }) => {
  const [platform, setPlatform] = useState<PromisePlatform>('instagram');
  const [metric, setMetric] = useState<PromiseMetric>('likes');
  const [before, setBefore] = useState('');
  const [after, setAfter] = useState('');
  const [posts, setPosts] = useState(String(PROMISE.postsRequired));
  const [links, setLinks] = useState('');
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<Result>('/api/app/promise', {
        method: 'POST',
        json: { product, platform, metric, beforeAverage: Number(before), afterAverage: Number(after), postsCounted: Number(posts), links: links.split(/\s+/).filter(Boolean), sharePermission: share },
      });
      track('promise_claimed', { product, outcome: result.outcome });
      onDone(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send your results.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Where did you post?" htmlFor="promise-platform">
          <Select id="promise-platform" value={platform} onChange={(e) => setPlatform(e.target.value as PromisePlatform)}>
            {PROMISE.platforms.map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}
          </Select>
        </Field>
        <Field label="What did you count?" htmlFor="promise-metric">
          <Select id="promise-metric" value={metric} onChange={(e) => setMetric(e.target.value as PromiseMetric)}>
            {PROMISE.metrics.map((m) => <option key={m} value={m}>{m[0]?.toUpperCase()}{m.slice(1)}</option>)}
          </Select>
        </Field>
        <Field label={`Average ${metric}: your last ${PROMISE.postsRequired} posts before Next5`} htmlFor="promise-before">
          <TextInput id="promise-before" inputMode="numeric" required value={before} onChange={(e) => setBefore(e.target.value.replace(/\D/g, ''))} />
        </Field>
        <Field label={`Average ${metric}: your Next5 posts`} htmlFor="promise-after">
          <TextInput id="promise-after" inputMode="numeric" required value={after} onChange={(e) => setAfter(e.target.value.replace(/\D/g, ''))} />
        </Field>
      </div>
      <Field label="How many Next5 photos did you post?" htmlFor="promise-posts" helper={`At least ${PROMISE.postsRequired}.`}>
        <TextInput id="promise-posts" inputMode="numeric" required value={posts} onChange={(e) => setPosts(e.target.value.replace(/\D/g, ''))} />
      </Field>
      <Field label="Links to your posts (optional)" htmlFor="promise-links" helper="Paste links, one per line. It helps us check fast.">
        <Textarea id="promise-links" rows={3} value={links} onChange={(e) => setLinks(e.target.value)} />
      </Field>
      <Checkbox checked={share} onChange={setShare} label="Next5 may share my results (first name and shop or business name only)." />
      {error && <p role="alert" className="text-[13px] text-app-danger">{error}</p>}
      <AppButton type="submit" loading={busy} disabled={!before || !after}>Send my results</AppButton>
    </form>
  );
};
