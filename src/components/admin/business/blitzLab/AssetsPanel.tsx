'use client';

import { BLITZ_LAYER_LABELS } from '../../../../config/blitzLab';
import type { BlitzAssetDto } from './api';
import { AssetPicker } from './AssetPicker';
import type { BlitzUploadType } from './upload';
import type { UploadStatus } from './useBlitzUploads';

type CurrentAssets = {
  backgroundKey: string;
  overlayKey: string;
  audioKey?: string;
};

type AssetsPanelProps = {
  assets: BlitzAssetDto[];
  currentAssets: CurrentAssets;
  /** Which swap picker is open (controlled so the right panel can open it too). */
  picker: BlitzUploadType | null;
  onPickerChange: (type: BlitzUploadType | null) => void;
  /** In-flight uploads by temporary key. */
  uploads: Record<string, UploadStatus>;
  onPickFile: (type: BlitzUploadType, file: File) => void;
  onRetryUpload: (localKey: string) => void;
  captionText: string;
  mentionBusiness: boolean;
  regenPrompt: string;
  onSwapAsset: (type: BlitzUploadType, key: string) => void;
  onCaptionChange: (text: string) => void;
  onMentionBusinessChange: (val: boolean) => void;
  onRegenPromptChange: (val: string) => void;
  onRegenerateText: () => void;
  isRegenerating: boolean;
};

/** Upload progress bar, or the error with a retry button. */
function UploadLine({ status, onRetry }: { status: UploadStatus | undefined; onRetry: () => void }) {
  if (!status) return null;
  if (status.error) {
    return (
      <p className="mt-1 text-[11px] text-red-600">
        {status.error}{' '}
        <button type="button" onClick={onRetry} className="font-medium underline">Retry</button>
      </p>
    );
  }
  return (
    <div className="mt-1 flex items-center gap-2" aria-label="Upload progress">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-alt">
        <div className="h-full rounded-full bg-orange-500 transition-[width] duration-200" style={{ width: `${Math.round(status.progress * 100)}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-muted">{Math.round(status.progress * 100)}%</span>
    </div>
  );
}

export function AssetsPanel({
  assets,
  currentAssets,
  picker,
  onPickerChange,
  uploads,
  onPickFile,
  onRetryUpload,
  captionText,
  mentionBusiness,
  regenPrompt,
  onSwapAsset,
  onCaptionChange,
  onMentionBusinessChange,
  onRegenPromptChange,
  onRegenerateText,
  isRegenerating,
}: AssetsPanelProps) {
  const layers: Array<'OVERLAY' | 'BACKGROUND'> = ['OVERLAY', 'BACKGROUND'];

  const currentKeyFor = (type: BlitzUploadType) =>
    type === 'BACKGROUND' ? currentAssets.backgroundKey : currentAssets.overlayKey;

  const assetNameFor = (type: BlitzUploadType) => {
    const key = currentKeyFor(type);
    return assets.find((a) => a.r2Key === key)?.name ?? 'Default';
  };

  const thumbnailFor = (type: BlitzUploadType) => {
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
                    <UploadLine
                      status={uploads[currentKeyFor(type)]}
                      onRetry={() => onRetryUpload(currentKeyFor(type))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onPickerChange(type)}
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
          type={picker}
          assets={assets}
          currentKey={currentKeyFor(picker)}
          onSelect={(key) => onSwapAsset(picker, key)}
          onPickFile={(file) => onPickFile(picker, file)}
          onClose={() => onPickerChange(null)}
        />
      )}
    </>
  );
}
