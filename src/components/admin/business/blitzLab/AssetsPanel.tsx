'use client';

import { useRef, useState } from 'react';
import { BLITZ_LAYER_LABELS } from '../../../../config/blitzLab';
import type { BlitzAssetDto } from './api';
import { blitzApi } from './api';

type CurrentAssets = {
  backgroundKey: string;
  overlayKey: string;
  audioKey?: string;
};

type AssetsPanelProps = {
  token: string;
  assets: BlitzAssetDto[];
  currentAssets: CurrentAssets;
  captionText: string;
  mentionBusiness: boolean;
  regenPrompt: string;
  onSwapAsset: (type: 'BACKGROUND' | 'OVERLAY', key: string) => void;
  /** Called when a freshly-uploaded asset should be registered in the parent's asset list */
  onAssetUploaded: (dto: BlitzAssetDto) => void;
  onCaptionChange: (text: string) => void;
  onMentionBusinessChange: (val: boolean) => void;
  onRegenPromptChange: (val: string) => void;
  onRegenerateText: () => void;
  isRegenerating: boolean;
};

type PickerProps = {
  token: string;
  type: 'BACKGROUND' | 'OVERLAY';
  assets: BlitzAssetDto[];
  currentKey: string;
  onSelect: (key: string) => void;
  onUploaded: (dto: BlitzAssetDto) => void;
  onClose: () => void;
};

const AssetPicker = ({ token, type, assets, currentKey, onSelect, onUploaded, onClose }: PickerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const filtered = assets.filter((a) => a.type === type);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    const res = await blitzApi.uploadAsset(token, type, file);

    setIsUploading(false);

    if (!res.ok || !res.data.r2Key) {
      setUploadError(res.data.error ?? 'Upload failed');
      return;
    }

    // Build a local DTO so the preview player can resolve the URL
    const dto: BlitzAssetDto = {
      id: `upload-${Date.now()}`,
      name: res.data.name ?? file.name,
      type,
      r2Key: res.data.r2Key,
      url: res.data.url ?? res.data.r2Key,
      thumbnailUrl: null,
      createdAt: new Date().toISOString(),
    };

    onUploaded(dto);
    onSelect(dto.r2Key);
    onClose();

    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const accept = type === 'OVERLAY' ? 'video/*' : 'video/*,image/*';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-80 rounded-2xl border border-line bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-[13px] font-semibold text-ink">
          Swap {BLITZ_LAYER_LABELS[type] ?? type}
        </p>

        {/* ── Existing library assets ─────────────────────────────── */}
        {filtered.length > 0 && (
          <div className="flex flex-col gap-2 mb-3">
            {filtered.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => { onSelect(asset.r2Key); onClose(); }}
                className={[
                  'flex items-center gap-3 rounded-xl border px-3 py-2 text-left text-[13px] transition-colors',
                  asset.r2Key === currentKey
                    ? 'border-orange-400 bg-orange-50 font-medium text-ink'
                    : 'border-line hover:bg-surface-alt text-ink',
                ].join(' ')}
              >
                {asset.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.thumbnailUrl} alt="" className="h-10 w-6 rounded object-cover" />
                ) : (
                  <span className="flex h-10 w-6 items-center justify-center rounded bg-surface-alt text-[10px] text-muted">
                    {type[0]}
                  </span>
                )}
                <span className="min-w-0 truncate">{asset.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Divider ─────────────────────────────────────────────── */}
        {filtered.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 border-t border-line" />
            <span className="text-[11px] text-muted">or</span>
            <div className="flex-1 border-t border-line" />
          </div>
        )}

        {/* ── Upload button ───────────────────────────────────────── */}
        <label
          className={[
            'flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 py-2.5 text-[13px] font-medium transition-colors',
            isUploading
              ? 'border-orange-300 bg-orange-50 text-orange-600 cursor-not-allowed'
              : 'border-line hover:border-orange-400 hover:bg-orange-50 text-muted hover:text-orange-600',
          ].join(' ')}
        >
          {isUploading ? (
            <>
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Uploading…
            </>
          ) : (
            <>
              <span className="text-base leading-none">↑</span>
              Upload {type === 'OVERLAY' ? 'video' : 'video or image'}
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={isUploading}
            className="sr-only"
          />
        </label>

        {uploadError && (
          <p className="mt-2 text-[12px] text-red-600">{uploadError}</p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg border border-line py-1.5 text-[12px] text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export function AssetsPanel({
  token,
  assets,
  currentAssets,
  captionText,
  mentionBusiness,
  regenPrompt,
  onSwapAsset,
  onAssetUploaded,
  onCaptionChange,
  onMentionBusinessChange,
  onRegenPromptChange,
  onRegenerateText,
  isRegenerating,
}: AssetsPanelProps) {
  const [picker, setPicker] = useState<'BACKGROUND' | 'OVERLAY' | null>(null);

  const layers: Array<'OVERLAY' | 'BACKGROUND'> = ['OVERLAY', 'BACKGROUND'];

  const currentKeyFor = (type: 'BACKGROUND' | 'OVERLAY') =>
    type === 'BACKGROUND' ? currentAssets.backgroundKey : currentAssets.overlayKey;

  const assetNameFor = (type: 'BACKGROUND' | 'OVERLAY') => {
    const key = currentKeyFor(type);
    return assets.find((a) => a.r2Key === key)?.name ?? 'Default';
  };

  const thumbnailFor = (type: 'BACKGROUND' | 'OVERLAY') => {
    const key = currentKeyFor(type);
    return assets.find((a) => a.r2Key === key)?.thumbnailUrl ?? null;
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* ── Layer list ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="mb-3 text-[13px] font-semibold text-ink">Assets</p>
          <div className="flex flex-col gap-2">
            {layers.map((type) => {
              const thumb = thumbnailFor(type);
              return (
                <div key={type} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2">
                  {/* Thumbnail */}
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-10 w-6 flex-shrink-0 rounded object-cover" />
                  ) : (
                    <span className="flex h-10 w-6 flex-shrink-0 items-center justify-center rounded bg-surface-alt text-[10px] text-muted">
                      {type[0]}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-ink">{BLITZ_LAYER_LABELS[type]}</p>
                    <p className="truncate text-[11px] text-muted">{assetNameFor(type)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPicker(type)}
                    className="shrink-0 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-ink hover:bg-surface-alt"
                  >
                    Swap
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Mention Your Business? ─────────────────────────────────── */}
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-ink">Mention Your Business?</p>
            <div className="flex gap-2">
              {(['Yes', 'No'] as const).map((label) => {
                const val = label === 'Yes';
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => onMentionBusinessChange(val)}
                    className={[
                      'rounded-full px-3 py-1.5 text-[12px] transition-colors',
                      mentionBusiness === val
                        ? 'bg-orange-500 text-white'
                        : 'bg-white text-muted ring-1 ring-line hover:text-ink',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Caption / Prompt ───────────────────────────────────────── */}
        <div className="rounded-2xl border border-line bg-white p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-muted">Caption</label>
            <textarea
              value={captionText}
              onChange={(e) => onCaptionChange(e.target.value)}
              rows={3}
              placeholder="Enter caption text…"
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-ink/10 resize-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-muted">Prompt (optional)</label>
            <textarea
              value={regenPrompt}
              onChange={(e) => onRegenPromptChange(e.target.value)}
              rows={2}
              placeholder="Freeform instructions for text regeneration…"
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[13px] text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-ink/10 resize-none"
            />
          </div>
          <button
            type="button"
            onClick={onRegenerateText}
            disabled={isRegenerating}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface-alt disabled:opacity-40"
          >
            {isRegenerating ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Regenerating…
              </>
            ) : (
              '↺ Regenerate Text'
            )}
          </button>
        </div>
      </div>

      {/* ── Asset picker modal ─────────────────────────────────────── */}
      {picker && (
        <AssetPicker
          token={token}
          type={picker}
          assets={assets}
          currentKey={currentKeyFor(picker)}
          onSelect={(key) => onSwapAsset(picker, key)}
          onUploaded={onAssetUploaded}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
}
