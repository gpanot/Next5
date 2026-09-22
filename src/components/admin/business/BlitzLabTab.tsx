'use client';

/**
 * Blitz Lab — Admin Tab
 *
 * Three-panel editor (assets left, player center, context right) + library grid below.
 *
 * All editing state is local (no draft DB saves). The single project write happens
 * when "Done Editing" is clicked: POST /api/admin/blitz/render creates the
 * BlitzProject with renderStatus=PENDING. The Railway worker picks it up.
 * Uploaded files are saved as BlitzAsset rows so they are reusable.
 *
 * Layer model: click the caption or the meme clip on the canvas to select it
 * (or use the tabs on the right). Dragging moves the layer under the pointer.
 */

import { useCallback, useEffect, useState } from 'react';
import { BLITZ_DEFAULT_TEXT_CONFIG, BLITZ_CANVAS_HEIGHT } from '../../../config/blitzLab';
import type { GreenScreenProps, TextConfig } from '../../../remotion/types';
import { AssetsPanel } from './blitzLab/AssetsPanel';
import { PreviewPlayer } from './blitzLab/PreviewPlayer';
import { ContextPanel } from './blitzLab/ContextPanel';
import { LibraryGrid } from './blitzLab/LibraryGrid';
import { RenderControls } from './blitzLab/RenderControls';
import { blitzApi, type BlitzAssetDto, type BlitzProjectDto, type BlitzTemplateDto } from './blitzLab/api';
import type { BlitzLayer } from './blitzLab/canvasHitTest';
import type { BlitzUploadType } from './blitzLab/upload';
import { isLocalKey, useBlitzUploads } from './blitzLab/useBlitzUploads';
import { useBlitzRender } from './blitzLab/useBlitzRender';

type Props = { token: string };

type CurrentAssets = {
  backgroundKey: string;
  overlayKey: string;
  audioKey?: string;
};

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Build the full GreenScreenProps from the current editor state.
 * For preview: r2Key → signed URL (or blob: URL for a fresh upload).
 * For rendering: the worker signs its own URLs from the R2 keys.
 */
const buildInputProps = (
  template: BlitzTemplateDto,
  assets: BlitzAssetDto[],
  current: CurrentAssets,
  overlay: { zoom: number; offsetX: number; offsetY: number },
  caption: string,
  textConfig: TextConfig,
): GreenScreenProps => {
  const find = (key: string) => assets.find((a) => a.r2Key === key);
  const background = find(current.backgroundKey);
  return {
    backgroundUrl: background?.url ?? current.backgroundKey,
    backgroundIsImage: background ? background.mediaKind === 'image' : undefined,
    overlayUrl: find(current.overlayKey)?.url ?? current.overlayKey,
    audioUrl: current.audioKey ? find(current.audioKey)?.url ?? current.audioKey : undefined,
    captionText: caption,
    overlayZoom: overlay.zoom,
    overlayOffsetX: overlay.offsetX,
    overlayOffsetY: overlay.offsetY,
    textConfig,
    durationInFrames: Math.round(template.durationSeconds * template.fps),
    fps: template.fps,
  };
};

/** Template textConfig + defaults + user overrides. */
const mergeTextConfig = (templateTextConfig: unknown, overrides: Partial<TextConfig>): TextConfig => {
  const base = (templateTextConfig ?? {}) as Partial<TextConfig>;
  const defined = <T extends object>(o: T) =>
    Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
  return { ...BLITZ_DEFAULT_TEXT_CONFIG, ...defined(base), ...defined(overrides) };
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function EditorSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr_220px]" aria-busy="true">
      <div className="h-72 animate-pulse rounded-2xl bg-surface-alt" />
      <div className="mx-auto w-full max-w-[400px] animate-pulse rounded-2xl bg-surface-alt" style={{ aspectRatio: '9/16' }} />
      <div className="h-48 animate-pulse rounded-2xl bg-surface-alt" />
    </div>
  );
}

// ── component ─────────────────────────────────────────────────────────────────

export function BlitzLabTab({ token }: Props) {
  // ── data ──────────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<BlitzTemplateDto[]>([]);
  const [assets, setAssets] = useState<BlitzAssetDto[]>([]);
  const [library, setLibrary] = useState<BlitzProjectDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── editor state ──────────────────────────────────────────────────────
  const [selectedTemplate, setSelectedTemplate] = useState<BlitzTemplateDto | null>(null);
  const [currentAssets, setCurrentAssets] = useState<CurrentAssets>({ backgroundKey: '', overlayKey: '' });
  const [overlayZoom, setOverlayZoom] = useState(1.0);
  const [overlayOffsetX, setOverlayOffsetX] = useState(0);
  const [overlayOffsetY, setOverlayOffsetY] = useState(0);
  const [captionText, setCaptionText] = useState('');
  const [mentionBusiness, setMentionBusiness] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<BlitzLayer>('OVERLAY');
  const [picker, setPicker] = useState<BlitzUploadType | null>(null);
  /** Per-session overrides on top of the template's textConfig */
  const [textOverride, setTextOverride] = useState<Partial<TextConfig>>({});

  // ── uploads + render ──────────────────────────────────────────────────
  const handleKeyReplaced = useCallback((localKey: string, r2Key: string) => {
    setCurrentAssets((prev) => ({
      ...prev,
      backgroundKey: prev.backgroundKey === localKey ? r2Key : prev.backgroundKey,
      overlayKey: prev.overlayKey === localKey ? r2Key : prev.overlayKey,
    }));
  }, []);
  const { uploads, startUpload, retry } = useBlitzUploads({ token, setAssets, onKeyReplaced: handleKeyReplaced });

  const handleRenderCompleted = useCallback((project: BlitzProjectDto) => {
    setLibrary((prev) => [project, ...prev.filter((p) => p.id !== project.id)]);
  }, []);
  const render = useBlitzRender(token, handleRenderCompleted);

  // ── load initial data ──────────────────────────────────────────────────
  const initTemplate = useCallback((template: BlitzTemplateDto, allAssets: BlitzAssetDto[]) => {
    setSelectedTemplate(template);
    const defaults = template.defaultAssets as { backgroundKey?: string; overlayKey?: string; audioKey?: string };
    setCurrentAssets({
      backgroundKey: defaults.backgroundKey ?? allAssets.find((a) => a.type === 'BACKGROUND')?.r2Key ?? '',
      overlayKey: defaults.overlayKey ?? allAssets.find((a) => a.type === 'OVERLAY')?.r2Key ?? '',
      audioKey: defaults.audioKey,
    });
    setCaptionText(template.defaultHookText ?? '');
    setOverlayZoom(1.0);
    setOverlayOffsetX(0);
    setOverlayOffsetY(0);
    setTextOverride({});
    setMentionBusiness(false);
    setRegenPrompt('');
  }, []);

  useEffect(() => {
    Promise.all([blitzApi.listTemplates(token), blitzApi.listAssets(token), blitzApi.listCompleted(token)])
      .then(([tRes, aRes, lRes]) => {
        if (!tRes.ok) { setLoadError(tRes.data.error ?? 'Failed to load templates'); return; }
        if (!aRes.ok) { setLoadError(aRes.data.error ?? 'Failed to load assets'); return; }
        setTemplates(tRes.data.templates ?? []);
        setAssets(aRes.data.assets ?? []);
        setLibrary(lRes.data.projects ?? []);
        const first = tRes.data.templates?.[0];
        if (first) initTemplate(first, aRes.data.assets ?? []);
      })
      .catch(() => setLoadError('Failed to load Blitz Lab data'))
      .finally(() => { setIsLoading(false); setLibraryLoading(false); });
  }, [token, initTemplate]);

  // ── actions ────────────────────────────────────────────────────────────
  const handleSwapAsset = useCallback((type: BlitzUploadType, key: string) => {
    setCurrentAssets((prev) => (type === 'BACKGROUND' ? { ...prev, backgroundKey: key } : { ...prev, overlayKey: key }));
  }, []);

  const handlePickFile = useCallback((type: BlitzUploadType, file: File) => {
    handleSwapAsset(type, startUpload(type, file));
  }, [handleSwapAsset, startUpload]);

  const handleOverlayOffsetChange = useCallback((dx: number, dy: number) => {
    setOverlayOffsetX((prev) => prev + dx);
    setOverlayOffsetY((prev) => prev + dy);
  }, []);

  /** Template values, so text drags and resets start from where the caption really is. */
  const templateText = mergeTextConfig(selectedTemplate?.textConfig, {});

  /** dx → offsetX (canvas px); dy → positionY (fraction of canvas height, caption bottom edge). */
  const handleTextOffsetChange = useCallback((dx: number, dy: number) => {
    setTextOverride((prev) => ({
      ...prev,
      offsetX: (prev.offsetX ?? templateText.offsetX ?? 0) + dx,
      positionY: clamp((prev.positionY ?? templateText.positionY) + dy / BLITZ_CANVAS_HEIGHT, 0.02, 0.97),
    }));
  }, [templateText.offsetX, templateText.positionY]);

  const handleResetPosition = useCallback(() => {
    setOverlayOffsetX(0);
    setOverlayOffsetY(0);
    setOverlayZoom(1.0);
  }, []);

  const handleResetTextPosition = useCallback(() => {
    setTextOverride((prev) => ({ ...prev, offsetX: templateText.offsetX ?? 0, positionY: templateText.positionY }));
  }, [templateText.offsetX, templateText.positionY]);

  const handleTextConfigChange = useCallback((patch: Partial<TextConfig>) => {
    setTextOverride((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleRegenerateText = useCallback(async () => {
    setIsRegenerating(true);
    setRegenError(null);
    const res = await blitzApi.generateCaption(token, { captionText, mentionBusiness, regenPrompt }).catch(() => null);
    setIsRegenerating(false);
    if (res?.ok && res.data.caption) setCaptionText(res.data.caption);
    else setRegenError(res?.data.error ?? 'Caption generation failed');
  }, [token, captionText, mentionBusiness, regenPrompt]);

  const handleDoneEditing = useCallback(() => {
    if (!selectedTemplate) return;
    void render.submit({
      templateId: selectedTemplate.id,
      currentAssets,
      overlayZoom,
      overlayOffsetX,
      overlayOffsetY,
      mentionBusiness,
      regenPrompt: regenPrompt || undefined,
      captionText,
      textConfigOverride: Object.keys(textOverride).length > 0 ? (textOverride as Record<string, unknown>) : undefined,
    });
  }, [render, selectedTemplate, currentAssets, overlayZoom, overlayOffsetX, overlayOffsetY, mentionBusiness, regenPrompt, captionText, textOverride]);

  const handleRefreshLibrary = useCallback(async () => {
    setLibraryLoading(true);
    const res = await blitzApi.listCompleted(token).catch(() => null);
    if (res?.ok) setLibrary(res.data.projects ?? []);
    setLibraryLoading(false);
  }, [token]);

  // ── derived ────────────────────────────────────────────────────────────
  const resolvedTextConfig = selectedTemplate ? mergeTextConfig(selectedTemplate.textConfig, textOverride) : null;
  const inputProps = selectedTemplate && resolvedTextConfig
    ? buildInputProps(selectedTemplate, assets, currentAssets,
        { zoom: overlayZoom, offsetX: overlayOffsetX, offsetY: overlayOffsetY }, captionText, resolvedTextConfig)
    : null;

  const uploadFailed = [currentAssets.backgroundKey, currentAssets.overlayKey].some((k) => uploads[k]?.error);
  const uploading = isLocalKey(currentAssets.backgroundKey) || isLocalKey(currentAssets.overlayKey);
  const blockedReason =
    !selectedTemplate || !currentAssets.backgroundKey || !currentAssets.overlayKey ? 'Pick a background and a meme video'
    : uploadFailed ? 'Upload failed — retry on the left'
    : uploading ? 'Uploading…'
    : !captionText.trim() ? 'Add a caption'
    : null;

  // ── render ─────────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        {loadError}
      </div>
    );
  }

  if (isLoading) return <EditorSkeleton />;

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-[15px] font-semibold text-ink">No templates yet</p>
        <p className="max-w-sm text-[13px] text-muted">
          Run <code className="rounded bg-surface-alt px-1 py-0.5 text-[12px]">npm run db:seed:blitz</code> to seed
          the first Green Screen template and test assets.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Blitz Lab</h1>
          <p className="text-[13px] text-muted">Layer assets → render a 9:16 video in seconds</p>
        </div>
        {templates.length > 1 && (
          <select
            value={selectedTemplate?.id ?? ''}
            onChange={(e) => {
              const t = templates.find((x) => x.id === e.target.value);
              if (t) initTemplate(t, assets);
            }}
            className="rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
          >
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[260px_1fr_220px]">
        {/* Left: Assets panel. Below the canvas on phones so the preview comes first. */}
        <div className="order-2 flex flex-col gap-4 lg:order-none">
          <AssetsPanel
            assets={assets}
            currentAssets={currentAssets}
            picker={picker}
            onPickerChange={setPicker}
            uploads={uploads}
            onPickFile={handlePickFile}
            onRetryUpload={retry}
            captionText={captionText}
            mentionBusiness={mentionBusiness}
            regenPrompt={regenPrompt}
            onSwapAsset={handleSwapAsset}
            onCaptionChange={setCaptionText}
            onMentionBusinessChange={setMentionBusiness}
            onRegenPromptChange={setRegenPrompt}
            onRegenerateText={handleRegenerateText}
            isRegenerating={isRegenerating}
          />
          {regenError && <p className="text-[12px] text-red-700">{regenError}</p>}
        </div>

        {/* Center: Preview player */}
        <div className="order-1 flex min-w-0 flex-col items-center gap-4 lg:order-none">
          {inputProps ? (
            <PreviewPlayer
              inputProps={inputProps}
              activeLayer={activeLayer}
              onSelectLayer={setActiveLayer}
              onOverlayOffsetChange={handleOverlayOffsetChange}
              onTextOffsetChange={handleTextOffsetChange}
            />
          ) : (
            <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-dashed border-line">
              <p className="text-[12px] text-muted">Select a template to preview</p>
            </div>
          )}
          <RenderControls state={render.state} isBusy={render.isBusy} blockedReason={blockedReason} onSubmit={handleDoneEditing} />
        </div>

        {/* Right: Context panel */}
        {resolvedTextConfig && (
          <div className="order-3 lg:order-none">
            <ContextPanel
              activeLayer={activeLayer}
              onActiveLayerChange={setActiveLayer}
              overlayZoom={overlayZoom}
              onZoomChange={setOverlayZoom}
              onResetPosition={handleResetPosition}
              onSwapOverlay={() => setPicker('OVERLAY')}
              textConfig={resolvedTextConfig}
              onTextConfigChange={handleTextConfigChange}
              onResetTextPosition={handleResetTextPosition}
            />
          </div>
        )}
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-ink">Library</h2>
          <button type="button" onClick={handleRefreshLibrary} className="text-[12px] text-muted underline hover:text-ink">
            Refresh
          </button>
        </div>
        <LibraryGrid projects={library} isLoading={libraryLoading && library.length === 0} />
      </section>
    </div>
  );
}
