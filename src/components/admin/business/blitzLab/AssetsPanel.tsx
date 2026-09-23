'use client';

import { BLITZ_LAYER_LABELS } from '../../../../config/blitzLab';
import type { BlitzAssetDto } from './api';
import { MusicIcon } from './icons';
import type { BlitzUploadType } from './upload';
import type { UploadStatus } from './useBlitzUploads';

export type CurrentAssets = {
  backgroundKey: string;
  overlayKey: string;
  audioKey?: string;
};

type AssetsPanelProps = {
  assets: BlitzAssetDto[];
  currentAssets: CurrentAssets;
  /** In-flight uploads by temporary key. */
  uploads: Record<string, UploadStatus>;
  onOpenPicker: (type: BlitzUploadType) => void;
  onRetryUpload: (localKey: string) => void;
  onRemoveAudio: () => void;
  muteVideoAudio: boolean;
  onMuteVideoAudioChange: (muted: boolean) => void;
  /** Clip length in seconds, shown so the user knows what sets it. */
  durationSeconds: number;
};

const LAYERS: BlitzUploadType[] = ['OVERLAY', 'BACKGROUND', 'AUDIO'];

export const keyForLayer = (current: CurrentAssets, type: BlitzUploadType): string =>
  type === 'BACKGROUND' ? current.backgroundKey : type === 'OVERLAY' ? current.overlayKey : current.audioKey ?? '';

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
  const pct = Math.round(status.progress * 100);
  return (
    <div className="mt-1 flex items-center gap-2" aria-label="Upload progress">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-alt">
        <div className="h-full rounded-full bg-orange-500 transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-muted">{pct}%</span>
    </div>
  );
}

/** Small square preview of the asset in use. */
function Thumb({ asset, type }: { asset: BlitzAssetDto | undefined; type: BlitzUploadType }) {
  const base = 'flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-alt text-muted dark:bg-neutral-800';
  if (type === 'AUDIO' || !asset) return <span className={base}>{type === 'AUDIO' ? <MusicIcon /> : <span className="text-[10px]">—</span>}</span>;
  if (asset.mediaKind === 'image') {
    // eslint-disable-next-line @next/next/no-img-element
    return <span className={base}><img src={asset.thumbnailUrl ?? asset.url} alt="" className="h-full w-full object-cover" /></span>;
  }
  return <span className={base}><video src={asset.url} poster={asset.thumbnailUrl ?? undefined} muted playsInline preload="none" className="h-full w-full object-cover" /></span>;
}

export function AssetsPanel({
  assets, currentAssets, uploads, onOpenPicker, onRetryUpload, onRemoveAudio,
  muteVideoAudio, onMuteVideoAudioChange, durationSeconds,
}: AssetsPanelProps) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-[13px] font-semibold text-ink">Assets</p>
        <p className="text-[11px] tabular-nums text-muted" title="Clip length = shortest video">{durationSeconds.toFixed(1)} s</p>
      </div>
      <div className="flex flex-col gap-2">
        {LAYERS.map((type) => {
          const key = keyForLayer(currentAssets, type);
          const asset = assets.find((a) => a.r2Key === key);
          const empty = !key;
          return (
            <div key={type} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2 dark:border-neutral-800">
              <Thumb asset={asset} type={type} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink">{BLITZ_LAYER_LABELS[type]}</p>
                <p className="truncate text-[11px] text-muted">{empty ? (type === 'AUDIO' ? 'None — video sound only' : 'None') : asset?.name ?? 'Default'}</p>
                <UploadLine status={uploads[key]} onRetry={() => onRetryUpload(key)} />
                {type === 'AUDIO' && !empty && (
                  <button type="button" onClick={onRemoveAudio} className="text-[11px] text-muted underline transition-colors hover:text-red-600">
                    Remove
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => onOpenPicker(type)}
                className="min-h-9 shrink-0 rounded-lg border border-line bg-white px-3 text-[12px] text-ink transition-colors hover:bg-surface-alt dark:bg-neutral-800"
              >
                {empty && type === 'AUDIO' ? 'Add' : 'Swap'}
              </button>
            </div>
          );
        })}
      </div>
      <label className="mt-3 flex min-h-9 cursor-pointer items-center justify-between gap-3 text-[12px] text-ink">
        <span>Mute video sound</span>
        <input
          type="checkbox"
          checked={muteVideoAudio}
          onChange={(e) => onMuteVideoAudioChange(e.target.checked)}
          className="h-4 w-4 accent-orange-500"
        />
      </label>
    </div>
  );
}
