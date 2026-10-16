'use client';

import { useRef, useState, type DragEvent } from 'react';
import type { AppShotAssetDto } from '../../../../../types/admin/slideshowCampaign';
import { CloseIcon, PhoneIcon } from './icons';
import { StepTitle } from './StepTitle';

type Props = { screen: AppShotAssetDto | null; uploading: boolean; onFile: (file: File) => void; onClear: () => void };

/** Step 2: the app screenshot. Drop or click to upload; the last one is kept for next time. */
export function ScreenStep({ screen, uploading, onFile, onClear }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };
  return (
    <section>
      <StepTitle n={2} title="App screen" done={screen !== null} />
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
      {screen ? (
        <div className="relative flex justify-center rounded-xl border border-white/10 bg-zinc-900 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={screen.url} alt="Your app screen" className={`aspect-[9/19.5] h-56 rounded-lg object-cover transition ${uploading ? 'opacity-40' : ''}`} />
          <button type="button" onClick={onClear} aria-label="Remove app screen" className="absolute top-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 active:scale-95"><CloseIcon /></button>
          <button type="button" onClick={() => input.current?.click()} disabled={uploading} className="absolute bottom-4 min-h-9 rounded-full bg-black/70 px-4 text-xs font-semibold text-white transition hover:bg-black/85 active:scale-95">
            {uploading ? 'Uploading…' : 'Replace'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={drop}
          disabled={uploading}
          className={`flex min-h-56 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 text-center transition ${over ? 'border-emerald-400 bg-emerald-400/5' : 'border-white/20 hover:bg-white/5'}`}
        >
          <PhoneIcon className="text-white/60" />
          <span className="text-sm text-white/80">{uploading ? 'Uploading…' : 'Drop a screenshot, or tap to browse'}</span>
          <span className="text-xs text-white/40">A raw phone screenshot, portrait. Not your store image with text or a phone frame.</span>
        </button>
      )}
    </section>
  );
}
