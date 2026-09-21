'use client';

import { Check, Loader2 } from 'lucide-react';
import { formatUsd } from '../../../lib/money';
import type { ProductDto } from '../../../types/business/products';
import { Badge } from '../../ui/Badge';

type Props = { products: ProductDto[]; selected: Set<string>; onToggle: (id: string) => void; onOpen: (p: ProductDto) => void };

const compact = (n: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

/** Imported catalog: TikTok image, price, sales, and whether Next5 has photographed it yet. */
export const CatalogGrid = ({ products, selected, onToggle, onOpen }: Props) => (
  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
    {products.map((p) => {
      const image = p.frontUrl ?? p.frontImageUrl ?? p.imageUrls[0] ?? null;
      const isSelected = selected.has(p.id);
      return (
        <li key={p.id} className={`relative flex flex-col overflow-hidden rounded-2xl border bg-app-panel transition-colors duration-200 ${isSelected ? 'border-app-accent ring-1 ring-app-accent' : 'border-app-line'}`}>
          <button type="button" onClick={() => onOpen(p)} className="relative aspect-[3/4] bg-app-sunken" aria-label={`Open ${p.name}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- storage or TikTok CDN image */}
            {image && <img src={image} alt={p.name} className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />}
            {p.photoPending && <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white"><Loader2 aria-hidden className="h-3 w-3 animate-spin" /> Getting photo</span>}
          </button>
          <button type="button" aria-label={isSelected ? `Unselect ${p.name}` : `Select ${p.name}`} aria-pressed={isSelected} disabled={p.photoPending} onClick={() => onToggle(p.id)} className={`absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 disabled:opacity-40 ${isSelected ? 'border-app-accent bg-app-cta text-app-cta-ink' : 'border-white bg-black/30'}`}>
            {isSelected && <Check aria-hidden className="h-4 w-4" />}
          </button>
          <div className="flex flex-col gap-1.5 p-3">
            <span className="line-clamp-2 text-[13px] font-medium leading-snug text-app-ink">{p.name}</span>
            <div className="flex items-center justify-between gap-2 text-[12px] text-app-muted">
              <span className="font-semibold tabular-nums text-app-ink">{p.priceCents != null ? formatUsd(p.priceCents, { showCents: true }) : '—'}</span>
              {p.soldCount != null && <span className="tabular-nums">{compact(p.soldCount)} sold</span>}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {p.timesUsed > 0 ? <Badge tone="success">Photographed</Badge> : <Badge tone="accent">Needs photos</Badge>}
              {p.soldSinceImport != null && p.soldSinceImport > 0 && <span className="text-[11px] text-app-success">+{p.soldSinceImport} since import</span>}
            </div>
          </div>
        </li>
      );
    })}
  </ul>
);
