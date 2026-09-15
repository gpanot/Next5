'use client';

import { FileSpreadsheet, Link2 } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { track } from '../../../lib/analytics';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { ShopConnectionDto } from '../../../types/business/shop';
import { AppButton } from '../../ui/AppButton';
import { Card, CardBody } from '../../ui/Card';
import { Checkbox } from '../../ui/Checkbox';
import { Field } from '../../ui/Field';
import { TextInput } from '../../ui/TextInput';

type Props = { onConnected: (c: ShopConnectionDto) => void; onImported: (count: number) => void };

/** Connect a TikTok Shop by link (public catalog) or by uploading the Seller Center product export. */
export const ConnectStoreCard = ({ onConnected, onImported }: Props) => {
  const [url, setUrl] = useState('');
  const [attest, setAttest] = useState(false);
  const [busy, setBusy] = useState<'link' | 'file' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const connect = async (e: FormEvent) => {
    e.preventDefault();
    setBusy('link');
    setError(null);
    try {
      const { connection } = await apiFetch<{ connection: ShopConnectionDto }>('/api/app/shop/connection', { method: 'POST', json: { url, attest } });
      track('store_connected', { source: 'link' });
      onConnected(connection);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not connect this store.');
    } finally {
      setBusy(null);
    }
  };

  const upload = async (file: File) => {
    setBusy('file');
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiFetch<{ imported: number }>('/api/app/shop/import-file', { method: 'POST', body: form });
      track('store_connected', { source: 'export' });
      onImported(res.imported);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not read this file.');
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardBody className="flex flex-col gap-6">
        <div>
          <h2 className="text-[20px] font-semibold text-app-ink">Connect your TikTok Shop</h2>
          <p className="mt-1 max-w-xl text-[14px] text-app-muted">We bring in your products, prices and sales. Then you pick what to photograph. Takes about a minute.</p>
        </div>
        <form onSubmit={connect} className="flex flex-col gap-4">
          <Field label="Your store link" htmlFor="store-url" helper="Open your shop on TikTok, tap Share, copy the link. A product link works too.">
            <div className="relative">
              <Link2 aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
              <TextInput id="store-url" inputMode="url" required placeholder="https://shop.tiktok.com/us/store/your-shop/…" value={url} onChange={(e) => setUrl(e.target.value)} className="pl-9" />
            </div>
          </Field>
          <Checkbox checked={attest} onChange={setAttest} label="I own or manage this shop." />
          {error && <p role="alert" className="text-[13px] text-app-danger">{error}</p>}
          <AppButton type="submit" size="lg" loading={busy === 'link'} disabled={!url || !attest || busy !== null} className="self-start">Import my store</AppButton>
        </form>
        <div className="flex flex-col gap-2 border-t border-app-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-[14px] text-app-muted"><FileSpreadsheet aria-hidden className="h-4 w-4" /> Or upload your product export from TikTok Seller Center (xlsx or csv).</p>
          <input ref={fileRef} type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
          <AppButton variant="secondary" loading={busy === 'file'} disabled={busy !== null} onClick={() => fileRef.current?.click()}>Upload export</AppButton>
        </div>
      </CardBody>
    </Card>
  );
};
