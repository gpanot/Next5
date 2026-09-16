'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { chunkBySize, compressImages } from '../../../lib/imageCompress';
import { AppButton } from '../../ui/AppButton';
import { FileDrop } from '../../ui/FileDrop';
import { Sheet } from '../../ui/Sheet';
import { GuideImages, PRODUCT_GUIDES } from '../onboarding/GuideImages';
import { ProductRowsEditor, type ProductRow, type RowError } from './ProductRowsEditor';

const MAX = 20;

type AddProductsSheetProps = { open: boolean; onClose: () => void; onSaved: (count: number) => void };

export const AddProductsSheet = ({ open, onClose, onSaved }: AddProductsSheetProps) => {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const addFiles = async (files: File[]) => {
    const room = MAX - rows.length;
    setMessage(files.length > room ? `You can add up to ${MAX} products at a time.` : null);
    setPreparing(true);
    try {
      // Phone photos are shrunk here: uploads stay under the 4.5 MB per request the server accepts.
      const ready = await compressImages(files.slice(0, room));
      const next = ready.map((file, i) => ({ file, previewUrl: URL.createObjectURL(file), name: (files[i]?.name ?? file.name).replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 60), category: '', colorName: '', sku: '', fit: '' }));
      setRows((prev) => [...prev, ...next]);
    } finally {
      setPreparing(false);
    }
  };

  const close = () => {
    rows.forEach((r) => URL.revokeObjectURL(r.previewUrl));
    setRows([]);
    setErrors([]);
    setMessage(null);
    onClose();
  };

  /** Uploads in groups that fit one request; products already saved stay saved if a later group fails. */
  const save = async () => {
    setSaving(true);
    setErrors([]);
    setMessage(null);
    const groups = chunkBySize(rows, (r) => r.file.size);
    let saved = 0;
    let done = 0;
    setProgress({ done: 0, total: rows.length });
    for (const group of groups) {
      const form = new FormData();
      group.forEach((r) => form.append('fronts', r.file));
      form.set('rows', JSON.stringify(group.map(({ name, category, colorName, sku, fit }) => ({ name, category, colorName, sku, fit }))));
      try {
        await apiFetch('/api/app/products/bulk', { method: 'POST', body: form });
        saved += group.length;
        done += group.length;
        setProgress({ done, total: rows.length });
      } catch (err) {
        // Row numbers come back per group: shift them so they point at the right row on screen.
        if (err instanceof ApiError && Array.isArray(err.details?.errors)) {
          setErrors((err.details.errors as RowError[]).map((e) => ({ ...e, index: e.index + done })));
        }
        setMessage(err instanceof ApiError ? err.message : 'Could not save your products.');
        // Keep the rows that still need saving, so the seller can fix and try again.
        setRows(rows.slice(done));
        if (saved > 0) onSaved(saved);
        setSaving(false);
        setProgress(null);
        return;
      }
    }
    setProgress(null);
    onSaved(saved);
    close();
  };

  return (
    <Sheet open={open} onClose={close} title="Add products" side="bottom" className="sm:left-1/2 sm:right-auto sm:w-full sm:max-w-4xl sm:-translate-x-1/2">
      <div className="flex max-h-[80dvh] flex-col gap-4 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
        <p className="text-[17px] font-semibold text-app-ink">Add products</p>
        {rows.length < MAX && <FileDrop multiple onFiles={(files) => void addFiles(files)} maxBytes={30 * 1024 * 1024} label={rows.length ? 'Add more front photos' : 'Drop up to 20 front photos'} hint="One item per photo, plain background, good light" />}
        {preparing && <p className="text-[13px] text-app-muted" aria-live="polite">Preparing your photos…</p>}
        {progress && <p className="text-[13px] text-app-muted" aria-live="polite">Saving {progress.done} of {progress.total}…</p>}
        {rows.length === 0 && <GuideImages guides={PRODUCT_GUIDES} />}
        {rows.length > 0 && <ProductRowsEditor rows={rows} errors={errors} onChange={setRows} />}
        {message && <p role="alert" className="text-[14px] text-app-danger">{message}</p>}
        <div className="flex justify-end gap-2 border-t border-app-line pt-4">
          <AppButton variant="ghost" onClick={close}>Cancel</AppButton>
          <AppButton loading={saving || preparing} disabled={rows.length === 0 || preparing} onClick={() => void save()}>Save {rows.length || ''} product{rows.length === 1 ? '' : 's'}</AppButton>
        </div>
      </div>
    </Sheet>
  );
};
