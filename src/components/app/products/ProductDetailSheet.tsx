'use client';

import { AppLink as Link } from '../shell/AppLink';
import { useState } from 'react';
import { PRODUCT_CATEGORIES } from '../../../config/shots';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { ProductDto } from '../../../types/business/products';
import { AppButton } from '../../ui/AppButton';
import { Field } from '../../ui/Field';
import { Select } from '../../ui/Select';
import { Sheet } from '../../ui/Sheet';
import { TextInput } from '../../ui/TextInput';
import { PhotoSlot } from '../shared/PhotoSlot';

type ProductDetailSheetProps = {
  product: ProductDto | null;
  onClose: () => void;
  onChanged: () => void;
  /** Asks the page to confirm archiving (or bringing back) this product. */
  onArchive: (productId: string, archived: boolean) => void;
};

export const ProductDetailSheet = ({ product, onClose, onChanged, onArchive }: ProductDetailSheetProps) => {
  if (!product) return null;
  return <ProductDetailBody key={product.id} product={product} onClose={onClose} onChanged={onChanged} onArchive={onArchive} />;
};

const ProductDetailBody = ({ product, onClose, onChanged, onArchive }: { product: ProductDto; onClose: () => void; onChanged: () => void; onArchive: (productId: string, archived: boolean) => void }) => {
  const [fields, setFields] = useState({ name: product.name, category: product.category, colorName: product.colorName ?? '', sku: product.sku ?? '', fit: product.fit ?? '', notes: product.notes ?? '' });
  const [files, setFiles] = useState<Record<'front' | 'back' | 'detail', { file: File; url: string } | null>>({ front: null, back: null, detail: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => form.set(k, v));
    if (files.front) form.set('front', files.front.file);
    if (files.back) form.set('back', files.back.file);
    if (files.detail) form.set('detail', files.detail.file);
    try {
      await apiFetch(`/api/app/products/${product.id}`, { method: 'PATCH', body: form });
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this product.');
      setBusy(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title={product.name} side="right">
      <div className="flex flex-col gap-5 overflow-y-auto p-5">
        <p className="text-[17px] font-semibold text-app-ink">{product.name}</p>
        <div className="grid grid-cols-3 gap-3">
          <PhotoSlot label="Front" previewUrl={files.front?.url ?? product.frontUrl} onFile={(file, url) => setFiles((f) => ({ ...f, front: { file, url } }))} aspect="square" capture="environment" />
          <PhotoSlot label="Back" hint="For back shots" previewUrl={files.back?.url ?? product.backUrl} onFile={(file, url) => setFiles((f) => ({ ...f, back: { file, url } }))} aspect="square" capture="environment" />
          <PhotoSlot label="Detail" hint="Prints, buttons" previewUrl={files.detail?.url ?? product.detailUrl} onFile={(file, url) => setFiles((f) => ({ ...f, detail: { file, url } }))} aspect="square" capture="environment" />
        </div>
        <Field label="Name" htmlFor="pd-name" required><TextInput id="pd-name" value={fields.name} onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))} /></Field>
        <Field label="Category" htmlFor="pd-category" required>
          <Select id="pd-category" value={fields.category} onChange={(e) => setFields((f) => ({ ...f, category: e.target.value }))}>{PRODUCT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Colour" htmlFor="pd-colour"><TextInput id="pd-colour" value={fields.colorName} onChange={(e) => setFields((f) => ({ ...f, colorName: e.target.value }))} /></Field>
          <Field label="SKU" htmlFor="pd-sku"><TextInput id="pd-sku" value={fields.sku} onChange={(e) => setFields((f) => ({ ...f, sku: e.target.value }))} /></Field>
        </div>
        <Field label="Notes" htmlFor="pd-notes" helper="Up to 120 characters, e.g. “cropped length”"><TextInput id="pd-notes" maxLength={120} value={fields.notes} onChange={(e) => setFields((f) => ({ ...f, notes: e.target.value }))} /></Field>
        {error && <p role="alert" className="text-[14px] text-app-danger">{error}</p>}
        <div className="flex flex-wrap justify-between gap-2 border-t border-app-line pt-4">
          <AppButton variant="ghost" onClick={() => onArchive(product.id, !product.archived)}>{product.archived ? 'Bring back' : 'Archive'}</AppButton>
          <div className="flex gap-2">
            <Link href={`/app/create?products=${product.id}`} className="inline-flex h-10 items-center rounded-xl border border-app-line px-4 text-[13px] font-medium text-app-ink hover:bg-app-sunken">Create photos</Link>
            <AppButton loading={busy} onClick={save}>Save</AppButton>
          </div>
        </div>
      </div>
    </Sheet>
  );
};
