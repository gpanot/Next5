'use client';

import { PRODUCT_CATEGORIES } from '../../../config/shots';
import { Select } from '../../ui/Select';
import { TextInput } from '../../ui/TextInput';

export type ProductRow = { file: File; previewUrl: string; name: string; category: string; colorName: string; sku: string; fit: string };
export type RowError = { index: number; field?: string; message: string };

type ProductRowsEditorProps = { rows: ProductRow[]; errors: RowError[]; onChange: (rows: ProductRow[]) => void };

/** One editable row per uploaded front photo. Stacks into cards on phones. */
export const ProductRowsEditor = ({ rows, errors, onChange }: ProductRowsEditorProps) => {
  const update = (index: number, patch: Partial<ProductRow>) => onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const applyCategory = (category: string) => onChange(rows.map((r) => ({ ...r, category })));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-app-muted">{rows.length} product{rows.length === 1 ? '' : 's'} · name and category are required</p>
        <div className="w-48">
          <Select aria-label="Apply category to all" value="" onChange={(e) => e.target.value && applyCategory(e.target.value)}>
            <option value="">Apply category to all…</option>
            {PRODUCT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </Select>
        </div>
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((row, index) => {
          const rowErrors = errors.filter((e) => e.index === index);
          return (
            <li key={row.previewUrl} className={`grid grid-cols-[64px_1fr] gap-3 rounded-2xl border p-3 sm:grid-cols-[64px_2fr_1.3fr_1fr_1fr_1fr] sm:items-center ${rowErrors.length ? 'border-app-danger/50' : 'border-app-line'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
              <img src={row.previewUrl} alt="" className="row-span-3 h-16 w-16 rounded-lg object-cover sm:row-span-1" />
              <TextInput aria-label={`Product ${index + 1} name`} placeholder="Name" value={row.name} error={rowErrors.some((e) => e.field === 'name')} onChange={(e) => update(index, { name: e.target.value })} />
              <Select aria-label={`Product ${index + 1} category`} value={row.category} error={rowErrors.some((e) => e.field === 'category')} onChange={(e) => update(index, { category: e.target.value })}>
                <option value="">Category</option>
                {PRODUCT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select>
              <TextInput aria-label={`Product ${index + 1} colour`} placeholder="Colour" value={row.colorName} onChange={(e) => update(index, { colorName: e.target.value })} />
              <TextInput aria-label={`Product ${index + 1} SKU`} placeholder="SKU" value={row.sku} onChange={(e) => update(index, { sku: e.target.value })} />
              <Select aria-label={`Product ${index + 1} fit`} value={row.fit} onChange={(e) => update(index, { fit: e.target.value })}>
                <option value="">Fit</option><option value="fitted">Fitted</option><option value="regular">Regular</option><option value="oversized">Oversized</option>
              </Select>
              {rowErrors.length > 0 && <p role="alert" className="col-span-2 text-[12px] text-app-danger sm:col-span-6">{rowErrors.map((e) => e.message).join(' ')}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
