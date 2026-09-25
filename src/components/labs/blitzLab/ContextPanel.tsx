'use client';

/**
 * Blitz Lab — Right-side Context Panel
 *
 * Tabs — Video, Text and (when on) Business — switch the editable layer.
 * Clicking a layer on the canvas selects the same tab.
 * • Overlay tab: Zoom slider, Reset Position, drag hint, Swap button.
 * • Text tab:    Caption Style presets + Font selector, Weight, Size, Color, Stroke.
 * • Business tab: Size, Reset Position.
 *
 * The drag direction hint matches whichever tab is active so the user knows
 * that dragging the canvas preview repositions the selected layer.
 */

import type React from 'react';
import { BLITZ_FONTS, BLITZ_DEFAULT_FONT, resolveBlitzFont } from '../../../remotion/fonts';
import { BUSINESS_DEFAULTS } from '../../../remotion/businessDefaults';
import type { TextConfig } from '../../../remotion/types';
import type { BlitzLayer } from './canvasHitTest';

// ── Caption style presets ─────────────────────────────────────────────────────

type CaptionStyleDef = {
  id: string;
  label: string;
  /** Fields to merge into TextConfig when this style is applied. */
  patch: Partial<TextConfig>;
  /** Visual thumbnail properties used to render the "Aa" preview. */
  preview: {
    font: string;             // CSS font-family
    color: string;
    fontWeight: number;
    strokeWidth: number;
    strokeColor: string;
    textBg?: string;          // box background (Snapchat / White Box / Yellow Pop styles)
    thumbnailBg: string;      // thumbnail square background
  };
};

const _f = (label: string) => BLITZ_FONTS.find((f) => f.label === label)?.value ?? BLITZ_DEFAULT_FONT;

const CAPTION_STYLES: CaptionStyleDef[] = [
  {
    id: 'tiktok-classic',
    label: 'TikTok classic',
    patch: { font: _f('Anton'), color: '#ffffff', fontWeight: 400, strokeWidth: 4, strokeColor: '#000000', textBackground: undefined },
    preview: { font: 'Anton, sans-serif', color: '#ffffff', fontWeight: 400, strokeWidth: 2, strokeColor: '#000000', thumbnailBg: '#111111' },
  },
  {
    id: 'bold-impact',
    label: 'Bold impact',
    patch: { font: _f('Bebas Neue'), color: '#ffffff', fontWeight: 400, strokeWidth: 6, strokeColor: '#111111', textBackground: undefined },
    preview: { font: "'Bebas Neue', sans-serif", color: '#ffffff', fontWeight: 400, strokeWidth: 3, strokeColor: '#111111', thumbnailBg: '#1c1c1c' },
  },
  {
    id: 'snapchat',
    label: 'Snapchat',
    patch: { font: _f('Poppins'), color: '#ffffff', fontWeight: 700, strokeWidth: 0, strokeColor: '#000000', textBackground: 'rgba(0,0,0,0.72)' },
    preview: { font: 'Poppins, sans-serif', color: '#ffffff', fontWeight: 700, strokeWidth: 0, strokeColor: '#000000', textBg: 'rgba(0,0,0,0.72)', thumbnailBg: '#444' },
  },
  {
    id: 'white-box',
    label: 'White box',
    patch: { font: _f('Inter'), color: '#111111', fontWeight: 700, strokeWidth: 0, strokeColor: '#000000', textBackground: 'rgba(255,255,255,0.95)' },
    preview: { font: 'Inter, sans-serif', color: '#111111', fontWeight: 700, strokeWidth: 0, strokeColor: '#000000', textBg: 'rgba(255,255,255,0.95)', thumbnailBg: '#555' },
  },
  {
    id: 'yellow-pop',
    label: 'Yellow pop',
    patch: { font: _f('Poppins'), color: '#FFE600', fontWeight: 800, strokeWidth: 0, strokeColor: '#000000', textBackground: '#000000' },
    preview: { font: 'Poppins, sans-serif', color: '#FFE600', fontWeight: 800, strokeWidth: 0, strokeColor: '#000000', textBg: '#000000', thumbnailBg: '#222' },
  },
  {
    id: 'clean-karaoke',
    label: 'Clean karaoke',
    patch: { font: _f('Montserrat'), color: '#ffffff', fontWeight: 600, strokeWidth: 0, strokeColor: '#000000', textBackground: undefined },
    preview: { font: 'Montserrat, sans-serif', color: '#ffffff', fontWeight: 600, strokeWidth: 0, strokeColor: '#000000', thumbnailBg: '#1a1a1a' },
  },
  {
    id: 'script-playful',
    label: 'Script playful',
    patch: { font: _f('Pacifico'), color: '#ffffff', fontWeight: 400, strokeWidth: 2, strokeColor: '#000000', textBackground: undefined },
    preview: { font: 'Pacifico, cursive', color: '#ffffff', fontWeight: 400, strokeWidth: 1, strokeColor: '#000000', thumbnailBg: '#1a1a1a' },
  },
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
  activeLayer: BlitzLayer;
  onActiveLayerChange: (layer: BlitzLayer) => void;
  /** Show the Business tab (only when the business line is on). */
  showBusiness: boolean;
  onResetBusinessPosition: () => void;
  /** Hide the Video (overlay) tab — for Slideshow which has no overlay. */
  hideOverlay?: boolean;
  // Overlay controls
  overlayZoom: number;
  onZoomChange: (zoom: number) => void;
  onResetPosition: () => void;
  onSwapOverlay: () => void;
  // Text controls
  textConfig: TextConfig;
  onTextConfigChange: (patch: Partial<TextConfig>) => void;
  onResetTextPosition: () => void;
  /** Optional "Auto Fit" CTA, shown under Reset Position in the Video and Text tabs. */
  autoFit?: React.ReactNode;
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

// ── Caption style thumbnail ───────────────────────────────────────────────────

function StyleThumb({ style }: { style: CaptionStyleDef }) {
  const p = style.preview;
  const textEl = (
    <span
      style={{
        fontFamily: p.font,
        fontWeight: p.fontWeight,
        fontSize: 15,
        color: p.color,
        lineHeight: 1,
        letterSpacing: '0.01em',
        ...(p.strokeWidth > 0
          ? ({ WebkitTextStroke: `${p.strokeWidth}px ${p.strokeColor}`, paintOrder: 'stroke fill' } as React.CSSProperties)
          : {}),
      }}
    >
      Aa
    </span>
  );

  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 9,
        background: p.thumbnailBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {p.textBg ? (
        <div
          style={{
            background: p.textBg,
            borderRadius: 5,
            padding: '2px 5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {textEl}
        </div>
      ) : (
        textEl
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ContextPanel({
  activeLayer,
  onActiveLayerChange,
  showBusiness,
  onResetBusinessPosition,
  hideOverlay = false,
  overlayZoom,
  onZoomChange,
  onResetPosition,
  onSwapOverlay,
  textConfig,
  onTextConfigChange,
  onResetTextPosition,
  autoFit,
}: ContextPanelProps) {
  const tabs: { id: BlitzLayer; label: string }[] = [
    ...(!hideOverlay ? [{ id: 'OVERLAY' as const, label: 'Video' }] : []),
    { id: 'TEXT', label: 'Text' },
    ...(showBusiness ? [{ id: 'BUSINESS' as const, label: 'Business' }] : []),
  ];

  const currentWeight =
    FONT_WEIGHTS.find((w) => w.value === (textConfig.fontWeight ?? 700)) ??
    FONT_WEIGHTS.find((w) => w.value === 700)!;

  /**
   * Match the active style by comparing the style-defining fields (font, color,
   * fontWeight, strokeWidth, strokeColor, textBackground). Positional fields
   * (fontSize, positionY, …) are intentionally excluded so the active chip
   * stays highlighted even after the user adjusts the size.
   */
  const activeStyleId = CAPTION_STYLES.find((s) => {
    const p = s.patch;
    return (
      resolveBlitzFont(textConfig.font) === resolveBlitzFont(p.font) &&
      (textConfig.color ?? '#ffffff') === (p.color ?? '#ffffff') &&
      (textConfig.fontWeight ?? 700) === (p.fontWeight ?? 700) &&
      (textConfig.strokeWidth ?? 3) === (p.strokeWidth ?? 3) &&
      (textConfig.strokeColor ?? '#000000') === (p.strokeColor ?? '#000000') &&
      (textConfig.textBackground ?? undefined) === (p.textBackground ?? undefined)
    );
  })?.id ?? null;

  const applyStyle = (style: CaptionStyleDef) => {
    // Spread the full patch so undefined values for textBackground are included,
    // letting mergeTextConfig's `defined()` filter clear any prior box background.
    onTextConfigChange(style.patch);
  };

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
              min={0.2}
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
            {autoFit}
          </>
        )}

        {/* ──────────────────────────── TEXT TAB ─────────────────────── */}
        {activeLayer === 'TEXT' && (
          <>
            {/* ── Caption style presets ──────────────────────────────── */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold tracking-widest text-muted/70 uppercase">
                Caption Style Mix
              </span>
              <div className="flex flex-col gap-0.5">
                {CAPTION_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => applyStyle(style)}
                    className={[
                      'flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all',
                      activeStyleId === style.id
                        ? 'border-orange-400 bg-orange-50 shadow-sm'
                        : 'border-transparent hover:border-line hover:bg-surface-alt',
                    ].join(' ')}
                  >
                    <StyleThumb style={style} />
                    <span className="text-[12px] font-medium text-ink">{style.label}</span>
                    {activeStyleId === style.id && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="-mx-4 border-t border-line" />

            {/* Font */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-muted">Font</span>
              <select
                value={resolveBlitzFont(textConfig.font)}
                onChange={(e) => onTextConfigChange({ font: e.target.value })}
                style={{ fontFamily: resolveBlitzFont(textConfig.font) }}
                className="w-full rounded-lg border border-line bg-white px-2 py-1.5 text-[12px] text-ink focus:outline-none focus:ring-2 focus:ring-orange-400/30"
              >
                {BLITZ_FONTS.map((f) => (
                  <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
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
            {autoFit}
          </>
        )}

        {/* ──────────────────────────── BUSINESS TAB ─────────────────── */}
        {activeLayer === 'BUSINESS' && showBusiness && (
          <>
            <SliderRow
              label="Size"
              value={textConfig.businessFontSize ?? BUSINESS_DEFAULTS.fontSize}
              min={24}
              max={72}
              step={2}
              display={`${textConfig.businessFontSize ?? BUSINESS_DEFAULTS.fontSize} px`}
              onChange={(v) => onTextConfigChange({ businessFontSize: v })}
            />
            <p className="rounded-lg bg-surface-alt px-2.5 py-2 text-[11px] leading-snug text-muted">
              Drag the business line on the preview to move it. Edit the text on the left.
            </p>
            <button
              type="button"
              onClick={onResetBusinessPosition}
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
