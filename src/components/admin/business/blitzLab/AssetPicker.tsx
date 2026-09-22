'use client';

import { BLITZ_LAYER_LABELS } from '../../../../config/blitzLab';
import type { BlitzAssetDto } from './api';
import { BLITZ_ACCEPT, type BlitzUploadType } from './upload';
import { isLocalKey } from './useBlitzUploads';

type AssetPickerProps = {
  type: BlitzUploadType;
  assets: BlitzAssetDto[];
  currentKey: string;
  onSelect: (key: string) => void;
  /** File picked from disk. The parent previews it at once and uploads in the background. */
  onPickFile: (file: File) => void;
  onClose: () => void;
};

/** Modal: pick a library asset of one layer type, or upload a new file. */
export function AssetPicker({ type, assets, currentKey, onSelect, onPickFile, onClose }: AssetPickerProps) {
  // Hide temporary local entries: they are not saved yet.
  const filtered = assets.filter((a) => a.type === type && !isLocalKey(a.r2Key));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    onPickFile(file);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full flex-col rounded-t-2xl border border-line bg-white p-4 shadow-xl sm:w-80 sm:rounded-2xl dark:border-neutral-800 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-[13px] font-semibold text-ink">Swap {BLITZ_LAYER_LABELS[type] ?? type}</p>

        {/* Upload first: it is the main action and stays in view. */}
        <label className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line px-3 py-2.5 text-[13px] font-medium text-muted transition-colors hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600">
          <span className="text-base leading-none">↑</span>
          Upload {type === 'OVERLAY' ? 'video' : 'video or image'}
          <input type="file" accept={BLITZ_ACCEPT[type]} onChange={handleFileChange} className="sr-only" />
        </label>

        {filtered.length > 0 && (
          <>
            <div className="my-3 flex items-center gap-2">
              <div className="flex-1 border-t border-line" />
              <span className="text-[11px] text-muted">or pick from library</span>
              <div className="flex-1 border-t border-line" />
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto">
              {filtered.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => { onSelect(asset.r2Key); onClose(); }}
                  className={[
                    'flex items-center gap-3 rounded-xl border px-3 py-2 text-left text-[13px] transition-colors',
                    asset.r2Key === currentKey
                      ? 'border-orange-400 bg-orange-50 font-medium text-ink'
                      : 'border-line text-ink hover:bg-surface-alt',
                  ].join(' ')}
                >
                  {asset.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.thumbnailUrl} alt="" className="h-10 w-6 rounded object-cover" />
                  ) : (
                    <span className="flex h-10 w-6 items-center justify-center rounded bg-surface-alt text-[10px] text-muted">
                      {asset.mediaKind === 'image' ? 'IMG' : 'VID'}
                    </span>
                  )}
                  <span className="min-w-0 truncate">{asset.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 min-h-10 w-full rounded-lg border border-line py-1.5 text-[12px] text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
