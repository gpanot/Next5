'use client';

/**
 * Tone & Voice section — Do's and Don'ts extracted from website + manually editable.
 * Sits at the top of the Brand page above Identity & Product.
 */
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { apiFetch } from '../../../lib/apiClient';
import type { ProductLineDto } from '../../../types/business/me';

const MAX_ITEMS = 10;

type Props = {
  product: ProductLineDto | null;
  toneDos: string[];
  toneDonts: string[];
  onUpdate: (dos: string[], donts: string[]) => void;
};

type ListEditorProps = {
  label: string;
  variant: 'dos' | 'donts';
  items: string[];
  onChange: (next: string[]) => void;
};

function ListEditor({ label, variant, items, onChange }: ListEditorProps) {
  const [draft, setDraft] = useState('');
  const accent = variant === 'dos' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-red-500 bg-red-50 border-red-200';
  const btnColor = variant === 'dos' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600';

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed || items.includes(trimmed) || items.length >= MAX_ITEMS) return;
    onChange([...items, trimmed]);
    setDraft('');
  };

  const remove = (i: number) => {
    onChange(items.filter((_, idx) => idx !== i));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[12px] font-semibold ${accent}`}>
          {variant === 'dos' ? '👍' : '👎'} {label}
          <span className="text-[11px] font-normal opacity-70">({items.length}/{MAX_ITEMS})</span>
        </span>
      </div>

      {items.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-xl border border-app-line bg-app-bg px-3 py-2">
              <span className="text-[13px] text-app-ink">{item}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-app-muted hover:text-app-danger shrink-0"
                aria-label={`Remove: ${item}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {items.length < MAX_ITEMS && (
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder={variant === 'dos' ? 'e.g., Use casual, conversational tone' : 'e.g., Never use corporate jargon'}
            className="flex-1 rounded-xl border border-app-line bg-app-bg px-3 py-2 text-[13px] text-app-ink focus:outline-none focus:ring-1 focus:ring-app-accent"
          />
          <button
            type="button"
            onClick={add}
            disabled={!draft.trim()}
            className={`flex items-center gap-1 rounded-xl px-3 py-2 text-[13px] font-medium text-white transition-colors disabled:opacity-40 ${btnColor}`}
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      )}
    </div>
  );
}

export function BrandToneSection({ product, toneDos, toneDonts, onUpdate }: Props) {
  const [localDos, setLocalDos] = useState<string[]>(toneDos);
  const [localDonts, setLocalDonts] = useState<string[]>(toneDonts);
  const [saving, setSaving] = useState(false);

  const handleDosChange = (next: string[]) => {
    setLocalDos(next);
    void persist(next, localDonts);
  };

  const handleDontsChange = (next: string[]) => {
    setLocalDonts(next);
    void persist(localDos, next);
  };

  const persist = async (dos: string[], donts: string[]) => {
    setSaving(true);
    try {
      await apiFetch('/api/app/workspace/brand-extract', {
        method: 'PATCH',
        json: { product, toneDos: dos, toneDonts: donts },
      });
      onUpdate(dos, donts);
    } catch {
      // silently ignore — UI already updated
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex flex-col gap-0 rounded-2xl border border-app-line bg-app-surface overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-app-line">
        <div>
          <h2 className="text-[15px] font-semibold text-app-ink">Tone &amp; Voice</h2>
          <p className="text-[12px] text-app-muted">Define rules for how your content copy should sound. These apply to all generated content text.</p>
        </div>
        {saving && <span className="text-[11px] text-app-muted">Saving…</span>}
      </div>

      <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-app-line p-5 gap-5">
        <ListEditor label="Do's" variant="dos" items={localDos} onChange={handleDosChange} />
        <ListEditor label="Don'ts" variant="donts" items={localDonts} onChange={handleDontsChange} />
      </div>
    </section>
  );
}
