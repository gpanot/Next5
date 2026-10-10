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
import { BLITZ_FONTS, resolveBlitzFont } from '../../../remotion/fonts';
import { BUSINESS_DEFAULTS } from '../../../remotion/businessDefaults';
import type { TextConfig } from '../../../remotion/types';
import type { BlitzLayer } from './canvasHitTest';
import type { HookCtaScope } from './useHookCtaStyle';
import { CAPTION_STYLES, StyleThumb, type CaptionStyleDef } from './captionStyles';

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
  /** Editor-level defaults the "Default" caption style restores on top of the template's (Slideshow: 74 px, no stroke). */
  defaultStyle?: Partial<TextConfig>;
  /** Slideshow: the "All slides / Hook & CTA" switch. `textConfig` and changes then follow the chosen slides. */
  scope?: HookCtaScope;
};

// ── Helper components ──────────────────────────────────────────────────────────

/** Which slides the Text controls style: all of them, or the hook (first) and CTA (last) on their own. */
function ScopeSwitch({ scope }: { scope: HookCtaScope }) {
  const options = [{ on: false, label: 'All slides' }, { on: true, label: 'Hook & CTA' }];
  return (
    <div className="flex flex-col gap-1.5">
      <div role="radiogroup" aria-label="Slides to style" className="grid grid-cols-2 gap-1 rounded-lg bg-surface-alt p-1 dark:bg-neutral-800">
        {options.map((o) => (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={scope.hookCta === o.on}
            onClick={() => scope.onChange(o.on)}
            className={[
              'min-h-8 rounded-md px-2 text-[12px] font-semibold transition-colors',
              scope.hookCta === o.on ? 'bg-white text-ink shadow-sm dark:bg-neutral-700 dark:text-neutral-100' : 'text-muted hover:text-ink',
            ].join(' ')}
          >
            {o.label}
          </button>
        ))}
      </div>
      {scope.hookCta && (
        <p className="text-[11px] leading-snug text-muted">
          Changes here only style the first and last slide.
          {scope.onClear && (
            <button type="button" onClick={scope.onClear} className="ml-1 font-semibold text-orange-600 hover:underline dark:text-orange-400">
              Match other slides
            </button>
          )}
        </p>
      )}
    </div>
  );
}

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
  defaultStyle,
  scope,
}: ContextPanelProps) {
  const styles = defaultStyle
    ? CAPTION_STYLES.map((s) => (s.id !== 'default' ? s : {
      ...s,
      patch: { ...s.patch, ...defaultStyle },
      preview: { ...s.preview, strokeWidth: Math.min(1, defaultStyle.strokeWidth ?? s.preview.strokeWidth) },
    }))
    : CAPTION_STYLES;
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
  const activeStyleId = styles.find((s) => {
    const p = s.patch;
    return (
      resolveBlitzFont(textConfig.font) === resolveBlitzFont(p.font) &&
      (textConfig.color ?? '#ffffff') === (p.color ?? '#ffffff') &&
      (textConfig.fontWeight ?? 700) === (p.fontWeight ?? 700) &&
      (textConfig.strokeWidth ?? 3) === (p.strokeWidth ?? 3) &&
      (textConfig.strokeColor ?? '#000000') === (p.strokeColor ?? '#000000') &&
      (textConfig.textBackground ?? undefined) === (p.textBackground ?? undefined) &&
      (textConfig.lineHighlight ?? false) === (p.lineHighlight ?? false)
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
            {scope && <ScopeSwitch scope={scope} />}
            {/* ── Caption style presets ──────────────────────────────── */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold tracking-widest text-muted/70 uppercase">
                Caption Style Mix
              </span>
              <div className="flex flex-col gap-0.5">
                {styles.map((style) => (
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
