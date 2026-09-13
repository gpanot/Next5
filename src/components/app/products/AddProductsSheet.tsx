'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
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

  const addFiles = (files: File[]) => {
    const room = MAX - rows.length;
    const next = files.slice(0, room).map((file) => ({ file, previewUrl: URL.createObjectURL(file), name: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 60), category: '', colorName: '', sku: '', fit: '' }));
    setRows((prev) => [...prev, ...next]);
    setMessage(files.length > room ? `You can add up to ${MAX} products at a time.` : null);
  };

  const close = () => {
    rows.forEach((r) => URL.revokeObjectURL(r.previewUrl));
    setRows([]);
    setErrors([]);
    setMessage(null);
    onClose();
  };

  const save = async () => {
    setSaving(true);
    setErrors([]);
    setMessage(null);
    const form = new FormData();
    rows.forEach((r) => form.append('fronts', r.file));
    form.set('rows', JSON.stringify(rows.map(({ name, category, colorName, sku, fit }) => ({ name, category, colorName, sku, fit }))));
    try {
      await apiFetch('/api/app/products/bulk', { method: 'POST', body: form });
      onSaved(rows.length);
      close();
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.details?.errors)) setErrors(err.details.errors as RowError[]);
      setMessage(err instanceof ApiError ? err.message : 'Could not save your products.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={close} title="Add products" side="bottom" className="sm:left-1/2 sm:right-auto sm:w-full sm:max-w-4xl sm:-translate-x-1/2">
      <div className="flex max-h-[80dvh] flex-col gap-4 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
        <p className="text-[17px] font-semibold text-app-ink">Add products</p>
        {rows.length < MAX && <FileDrop multiple onFiles={addFiles} maxBytes={12 * 1024 * 1024} label={rows.length ? 'Add more front photos' : 'Drop up to 20 front photos'} hint="One item per photo, plain background, good light" />}
        {rows.length === 0 && <GuideImages guides={PRODUCT_GUIDES} />}
        {rows.length > 0 && <ProductRowsEditor rows={rows} errors={errors} onChange={setRows} />}
        {message && <p role="alert" className="text-[14px] text-app-danger">{message}</p>}
        <div className="flex justify-end gap-2 border-t border-app-line pt-4">
          <AppButton variant="ghost" onClick={close}>Cancel</AppButton>
          <AppButton loading={saving} disabled={rows.length === 0} onClick={save}>Save {rows.length || ''} product{rows.length === 1 ? '' : 's'}</AppButton>
        </div>
      </div>
    </Sheet>
  );
};
