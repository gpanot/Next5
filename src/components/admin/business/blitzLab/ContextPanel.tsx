'use client';

/**
 * Blitz Lab — Right-side Context Panel
 *
 * Appears when a layer is selected. Controls:
 *   - Swap Image/Video — opens the asset picker in AssetsPanel
 *   - Zoom slider (0.5 – 3.0) with numeric readout
 *   - Reset Position — zeroes overlayOffsetX/Y and zoom
 *   - Add Overlay — no-op stub in v0
 */

type ContextPanelProps = {
  selectedLayer: 'OVERLAY' | 'BACKGROUND' | null;
  overlayZoom: number;
  onZoomChange: (zoom: number) => void;
  onResetPosition: () => void;
  onSwapRequest: () => void;   // triggers the picker in AssetsPanel
};

export function ContextPanel({
  selectedLayer,
  overlayZoom,
  onZoomChange,
  onResetPosition,
  onSwapRequest,
}: ContextPanelProps) {
  if (!selectedLayer) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-white p-4">
        <p className="text-[12px] text-muted text-center">Select a layer to edit</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
      <p className="text-[13px] font-semibold text-ink capitalize">{selectedLayer.toLowerCase()} layer</p>

      {/* ── Swap ─────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={onSwapRequest}
        className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-ink hover:bg-surface-alt"
      >
        Swap {selectedLayer === 'OVERLAY' ? 'Video' : 'Image'}
      </button>

      {/* ── Zoom (overlay only) ──────────────────────────────────── */}
      {selectedLayer === 'OVERLAY' && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-muted">Zoom</span>
            <span className="text-[12px] tabular-nums text-ink">
              {Math.round(overlayZoom * 100)} %
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={3.0}
            step={0.05}
            value={overlayZoom}
            onChange={(e) => onZoomChange(parseFloat(e.target.value))}
            className="w-full accent-ink"
          />
        </div>
      )}

      {/* ── Drag hint ────────────────────────────────────────────── */}
      {selectedLayer === 'OVERLAY' && (
        <p className="text-[11px] text-muted">
          Drag the overlay directly on the preview to reposition it.
        </p>
      )}

      {/* ── Reset Position ───────────────────────────────────────── */}
      {selectedLayer === 'OVERLAY' && (
        <button
          type="button"
          onClick={onResetPosition}
          className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-ink hover:bg-surface-alt"
        >
          Reset Position
        </button>
      )}

      {/* ── Add Overlay (stub, v0 no-op) ─────────────────────────── */}
      <button
        type="button"
        disabled
        title="Coming in a future version"
        className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-muted opacity-40 cursor-not-allowed"
      >
        + Add Overlay
      </button>
    </div>
  );
}
