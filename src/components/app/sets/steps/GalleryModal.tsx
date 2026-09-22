'use client';

import { Check, ImageOff, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLockBodyScroll } from '../../../../hooks/useLockBodyScroll';
import { apiFetch } from '../../../../lib/apiClient';

export type GalleryItem = {
  id: string;
  gender: string | null;
  age: number | null;
  ethnicity: string | null;
  url: string;
};

type GalleryModalProps = {
  onSelect: (item: GalleryItem) => void;
  onClose: () => void;
};

/** Full-screen grid picker for the curated influencer gallery. */
export const GalleryModal = ({ onSelect, onClose }: GalleryModalProps) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useLockBodyScroll(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    apiFetch<{ items: GalleryItem[] }>('/api/app/influencers/gallery')
      .then((data) => setItems(data.items))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load gallery.'))
      .finally(() => setLoading(false));
  }, []);

  const pick = (item: GalleryItem) => {
    setSelected(item.id);
    setTimeout(() => onSelect(item), 200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-app-bg animate-fade-in"
      role="dialog"
      aria-modal
      aria-label="Pick from gallery"
    >
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-app-line px-4">
        <h2 className="text-[17px] font-semibold text-app-ink">Pick a face</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full text-app-muted transition-colors hover:bg-app-sunken hover:text-app-ink"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Body */}
      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-4 sm:p-6">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-app-muted" />
          </div>
        )}
        {error && (
          <p className="py-8 text-center text-[14px] text-app-muted">{error}</p>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-app-muted">
            <ImageOff className="h-10 w-10 opacity-40" />
            <p className="text-[14px]">No gallery faces yet.</p>
          </div>
        )}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((item) => {
              const isSelected = selected === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pick(item)}
                  className={`group relative flex flex-col gap-2 rounded-2xl p-1.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent ${isSelected ? 'bg-app-accent-soft' : ''}`}
                >
                  <div
                    className={`relative aspect-[3/4] overflow-hidden rounded-xl bg-app-sunken ring-2 ${isSelected ? 'ring-app-accent' : 'ring-transparent group-hover:ring-app-line'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- presigned R2 URL */}
                    <img src={item.url} alt={[item.gender, item.ethnicity].filter(Boolean).join(', ') || 'Gallery face'} className="h-full w-full object-cover object-top" />
                    {isSelected && (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-app-accent text-white">
                        <Check className="h-4 w-4" aria-hidden />
                      </span>
                    )}
                  </div>
                  <span className="px-1 pb-1 text-[12px] leading-snug text-app-muted">
                    {[item.gender, item.ethnicity, item.age ? `~${item.age}` : null].filter(Boolean).join(' · ') || 'AI generated'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
