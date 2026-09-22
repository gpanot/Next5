'use client';

/**
 * Blitz Lab — Right-side Context Panel
 *
 * Two tabs — "Overlay" and "Text" — let the user switch the editable layer.
 * • Overlay tab: Zoom slider, Reset Position, drag hint, Swap button.
 * • Text tab:    Font selector, Weight, Size, Color, Stroke width, Stroke Color.
 *
 * The drag direction hint matches whichever tab is active so the user knows
 * that dragging the canvas preview repositions the selected layer.
 */

import type { TextConfig } from '../../../../remotion/types';

const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Impact', value: 'Impact, Charcoal, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Helvetica', value: 'Helvetica Neue, Helvetica, Arial, sans-serif' },
  { label: 'Courier', value: 'Courier New, monospace' },
  { label: 'Times', value: 'Times New Roman, serif' },
];

const FONT_WEIGHTS: { label: string; value: number }[] = [
  { label: 'Thin', value: 100 },
  { label: 'Light', value: 300 },
  { label: 'Regular', value: 400 },
  { label: 'Medium', value: 500 },
  { label: 'SemiBold', value: 600 },
  { label: 'Bold', value: 700 },
  { label: 'ExtraBold', value: 800 },
  { label: 'Black', value: 900 },
];

type ContextPanelProps = {
  activeLayer: 'OVERLAY' | 'TEXT';
  onActiveLayerChange: (layer: 'OVERLAY' | 'TEXT') => void;
  // Overlay controls
  overlayZoom: number;
  onZoomChange: (zoom: number) => void;
  onResetPosition: () => void;
  onSwapOverlay: () => void;
  // Text controls
  textConfig: TextConfig;
  onTextConfigChange: (patch: Partial<TextConfig>) => void;
  onResetTextPosition: () => void;
};

// ── Helper components ──────────────────────────────────────────────────────────

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted">{label}</span>
        <span className="text-[11px] tabular-nums text-ink">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-orange-500"
      />
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-medium text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 cursor-pointer rounded border border-line bg-white p-0.5"
        />
        <span className="text-[11px] tabular-nums text-ink uppercase">{value}</span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ContextPanel({
  activeLayer,
  onActiveLayerChange,
  overlayZoom,
  onZoomChange,
  onResetPosition,
  onSwapOverlay,
  textConfig,
  onTextConfigChange,
  onResetTextPosition,
}: ContextPanelProps) {
  const tabs: { id: 'OVERLAY' | 'TEXT'; label: string }[] = [
    { id: 'OVERLAY', label: '🎬 Video' },
    { id: 'TEXT', label: 'T Text' },
  ];

  const currentWeight =
    FONT_WEIGHTS.find((w) => w.value === (textConfig.fontWeight ?? 700)) ??
    FONT_WEIGHTS.find((w) => w.value === 700)!;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white overflow-hidden">
      {/* ── Tab switcher ─────────────────────────────────────────────── */}
      <div className="flex border-b border-line">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onActiveLayerChange(tab.id)}
            className={[
              'flex-1 py-2.5 text-[12px] font-medium transition-colors',
              activeLayer === tab.id
                ? 'border-b-2 border-orange-500 text-ink'
                : 'text-muted hover:text-ink',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 px-4 pb-4">
        {/* ──────────────────────────── OVERLAY TAB ──────────────────── */}
        {activeLayer === 'OVERLAY' && (
          <>
            {/* Swap */}
            <button
              type="button"
              onClick={onSwapOverlay}
              className="inline-flex min-h-8 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-ink hover:bg-surface-alt"
            >
              Swap Video
            </button>

            {/* Zoom */}
            <SliderRow
              label="Zoom"
              value={overlayZoom}
              min={0.5}
              max={3.0}
              step={0.05}
              display={`${Math.round(overlayZoom * 100)} %`}
              onChange={onZoomChange}
            />

            {/* Drag hint */}
            <p className="rounded-lg bg-surface-alt px-2.5 py-2 text-[11px] text-muted leading-snug">
              Drag the preview to reposition the video.
            </p>

            {/* Reset */}
            <button
              type="button"
              onClick={onResetPosition}
              className="inline-flex min-h-8 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-ink hover:bg-surface-alt"
            >
              ↺ Reset Position
            </button>
          </>
        )}

        {/* ──────────────────────────── TEXT TAB ─────────────────────── */}
        {activeLayer === 'TEXT' && (
          <>
            {/* Font */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-muted">Font</span>
              <select
                value={textConfig.font}
                onChange={(e) => onTextConfigChange({ font: e.target.value })}
                className="w-full rounded-lg border border-line bg-white px-2 py-1.5 text-[12px] text-ink focus:outline-none focus:ring-2 focus:ring-orange-400/30"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Weight */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted">Weight</span>
                <span className="text-[11px] text-ink">{currentWeight.label}</span>
              </div>
              <input
                type="range"
                min={100}
                max={900}
                step={100}
                value={textConfig.fontWeight ?? 700}
                onChange={(e) => onTextConfigChange({ fontWeight: parseInt(e.target.value) })}
                className="w-full accent-orange-500"
              />
            </div>

            {/* Size */}
            <SliderRow
              label="Size"
              value={textConfig.fontSize}
              min={24}
              max={120}
              step={2}
              display={`${textConfig.fontSize} px`}
              onChange={(v) => onTextConfigChange({ fontSize: v })}
            />

            {/* Color */}
            <ColorRow
              label="Color"
              value={textConfig.color ?? '#ffffff'}
              onChange={(v) => onTextConfigChange({ color: v })}
            />

            {/* Stroke width */}
            <SliderRow
              label="Stroke"
              value={textConfig.strokeWidth ?? 3}
              min={0}
              max={12}
              step={1}
              display={`${textConfig.strokeWidth ?? 3} px`}
              onChange={(v) => onTextConfigChange({ strokeWidth: v })}
            />

            {/* Stroke color */}
            <ColorRow
              label="Stroke Color"
              value={textConfig.strokeColor ?? '#000000'}
              onChange={(v) => onTextConfigChange({ strokeColor: v })}
            />

            {/* Drag hint */}
            <p className="rounded-lg bg-surface-alt px-2.5 py-2 text-[11px] text-muted leading-snug">
              Drag the preview to reposition the caption.
            </p>

            {/* Reset text position */}
            <button
              type="button"
              onClick={onResetTextPosition}
              className="inline-flex min-h-8 w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] text-ink hover:bg-surface-alt"
            >
              ↺ Reset Position
            </button>
          </>
        )}
      </div>
    </div>
  );
}
