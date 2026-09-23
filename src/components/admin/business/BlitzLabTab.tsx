'use client';

/**
 * Blitz Lab — Admin Tab
 *
 * Three-panel editor (assets + copy left, player center, context right) + library grid below.
 * Zero-LLM video: layers are composed in Remotion; only "Regenerate Text" calls a model.
 *
 * All editing state is local (no draft DB saves). The single project write happens
 * when "Done Editing" is clicked: POST /api/admin/blitz/render creates the
 * BlitzProject with renderStatus=PENDING. The Railway worker picks it up.
 *
 * Clip length = the shortest video layer (meme / background video).
 * Layers: click the caption, business line or meme on the canvas to select and drag it.
 */

import { useCallback, useEffect, useState } from 'react';
import { BLITZ_DEFAULT_DURATION_S } from '../../../config/blitzLab';
import type { GreenScreenProps } from '../../../remotion/types';
import { AssetLibraryModal } from './blitzLab/AssetLibraryModal';
import { AssetsPanel, keyForLayer, type CurrentAssets } from './blitzLab/AssetsPanel';
import { ContextPanel } from './blitzLab/ContextPanel';
import { CopyPanel } from './blitzLab/CopyPanel';
import { LibraryGrid } from './blitzLab/LibraryGrid';
import { PreviewPlayer } from './blitzLab/PreviewPlayer';
import { RenderControls } from './blitzLab/RenderControls';
import { blitzApi, type BlitzAssetDto, type BlitzProjectDto, type BlitzTemplateDto } from './blitzLab/api';
import type { BlitzLayer } from './blitzLab/canvasHitTest';
import type { BlitzUploadType } from './blitzLab/upload';
import { isLocalKey, useBlitzUploads } from './blitzLab/useBlitzUploads';
import { useBlitzRender } from './blitzLab/useBlitzRender';
import { useClipDuration } from './blitzLab/useClipDuration';
import { useTextLayout } from './blitzLab/useTextLayout';

type Props = { token: string };

type Overlay = { zoom: number; offsetX: number; offsetY: number };

const NO_OVERLAY_MOVE: Overlay = { zoom: 1, offsetX: 0, offsetY: 0 };

function EditorSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_220px]" aria-busy="true">
      <div className="h-72 animate-pulse rounded-2xl bg-surface-alt" />
      <div className="mx-auto w-full max-w-[400px] animate-pulse rounded-2xl bg-surface-alt" style={{ aspectRatio: '9/16' }} />
      <div className="h-48 animate-pulse rounded-2xl bg-surface-alt" />
    </div>
  );
}

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
  const [overlay, setOverlay] = useState<Overlay>(NO_OVERLAY_MOVE);
  const [captionText, setCaptionText] = useState('');
  const [mentionBusiness, setMentionBusiness] = useState(false);
  const [businessText, setBusinessText] = useState('');
  const [muteVideoAudio, setMuteVideoAudio] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<BlitzLayer>('OVERLAY');
  const [picker, setPicker] = useState<BlitzUploadType | null>(null);
  const [pauseSignal, setPauseSignal] = useState(0);
  const [playFromStartSignal, setPlayFromStartSignal] = useState(0);
  const text = useTextLayout(selectedTemplate?.textConfig);

  // ── uploads + render ──────────────────────────────────────────────────
  const handleKeyReplaced = useCallback((localKey: string, r2Key: string) => {
    setCurrentAssets((prev) => ({
      backgroundKey: prev.backgroundKey === localKey ? r2Key : prev.backgroundKey,
      overlayKey: prev.overlayKey === localKey ? r2Key : prev.overlayKey,
      audioKey: prev.audioKey === localKey ? r2Key : prev.audioKey,
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
    setOverlay(NO_OVERLAY_MOVE);
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

  // ── asset actions ──────────────────────────────────────────────────────
  const handleSwapAsset = useCallback((type: BlitzUploadType, key: string) => {
    setCurrentAssets((prev) =>
      type === 'BACKGROUND' ? { ...prev, backgroundKey: key }
      : type === 'OVERLAY' ? { ...prev, overlayKey: key }
      : { ...prev, audioKey: key || undefined });
  }, []);

  const handlePickFile = useCallback((type: BlitzUploadType, file: File) => {
    handleSwapAsset(type, startUpload(type, file));
  }, [handleSwapAsset, startUpload]);

  const handleRenameAsset = useCallback(async (id: string, name: string) => {
    const res = await blitzApi.renameAsset(token, id, name).catch(() => null);
    if (!res?.ok || !res.data.asset) return res?.data.error ?? 'Rename failed';
    const saved = res.data.asset;
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, name: saved.name } : a)));
    return null;
  }, [token]);

  const handleDeleteAsset = useCallback(async (id: string) => {
    const target = assets.find((a) => a.id === id);
    const res = await blitzApi.deleteAsset(token, id).catch(() => null);
    if (!res?.ok) return res?.data.error ?? 'Delete failed';
    setAssets((prev) => prev.filter((a) => a.id !== id));
    // If the deleted file was in use, fall back to the template default (or no audio).
    if (target && selectedTemplate) {
      const defaults = selectedTemplate.defaultAssets as { backgroundKey?: string; overlayKey?: string };
      setCurrentAssets((prev) => ({
        backgroundKey: prev.backgroundKey === target.r2Key ? defaults.backgroundKey ?? '' : prev.backgroundKey,
        overlayKey: prev.overlayKey === target.r2Key ? defaults.overlayKey ?? '' : prev.overlayKey,
        audioKey: prev.audioKey === target.r2Key ? undefined : prev.audioKey,
      }));
    }
    return null;
  }, [token, assets, selectedTemplate]);

  // ── canvas actions ─────────────────────────────────────────────────────
  const { dragCaption, dragBusiness } = text;
  const handleLayerDrag = useCallback((layer: BlitzLayer, dx: number, dy: number) => {
    if (layer === 'TEXT') dragCaption(dx, dy);
    else if (layer === 'BUSINESS') dragBusiness(dx, dy);
    else setOverlay((prev) => ({ ...prev, offsetX: prev.offsetX + dx, offsetY: prev.offsetY + dy }));
  }, [dragCaption, dragBusiness]);

  const handleMentionBusinessChange = useCallback((on: boolean) => {
    setMentionBusiness(on);
    setActiveLayer((prev) => (on ? 'BUSINESS' : prev === 'BUSINESS' ? 'TEXT' : prev));
  }, []);

  const handleRegenerateText = useCallback(async () => {
    setIsRegenerating(true);
    setRegenError(null);
    const res = await blitzApi.generateCaption(token, { captionText, mentionBusiness, businessText, regenPrompt }).catch(() => null);
    setIsRegenerating(false);
    if (res?.ok && res.data.caption) setCaptionText(res.data.caption);
    else setRegenError(res?.data.error ?? 'Caption generation failed');
  }, [token, captionText, mentionBusiness, businessText, regenPrompt]);

  const handleRefreshLibrary = useCallback(async () => {
    setLibraryLoading(true);
    const res = await blitzApi.listCompleted(token).catch(() => null);
    if (res?.ok) setLibrary(res.data.projects ?? []);
    setLibraryLoading(false);
  }, [token]);

  // ── derived ────────────────────────────────────────────────────────────
  const find = (key: string | undefined) => (key ? assets.find((a) => a.r2Key === key) : undefined);
  const background = find(currentAssets.backgroundKey);
  const overlayAsset = find(currentAssets.overlayKey);
  const audio = find(currentAssets.audioKey);
  const videoUrls = [overlayAsset?.url ?? '', background?.mediaKind === 'video' ? background.url : ''];
  const clip = useClipDuration(videoUrls, selectedTemplate?.durationSeconds ?? BLITZ_DEFAULT_DURATION_S);
  const showBusiness = mentionBusiness && businessText.trim().length > 0;

  const inputProps: GreenScreenProps | null = selectedTemplate ? {
    backgroundUrl: background?.url ?? currentAssets.backgroundKey,
    backgroundIsImage: background ? background.mediaKind === 'image' : undefined,
    overlayUrl: overlayAsset?.url ?? currentAssets.overlayKey,
    audioUrl: audio?.url,
    muteVideoAudio,
    businessText: showBusiness ? businessText : undefined,
    captionText,
    overlayZoom: overlay.zoom,
    overlayOffsetX: overlay.offsetX,
    overlayOffsetY: overlay.offsetY,
    textConfig: text.resolved,
    durationInFrames: Math.max(1, Math.round(clip.seconds * selectedTemplate.fps)),
    fps: selectedTemplate.fps,
  } : null;

  const keys = [currentAssets.backgroundKey, currentAssets.overlayKey, currentAssets.audioKey ?? ''];
  const blockedReason =
    !selectedTemplate || !currentAssets.backgroundKey || !currentAssets.overlayKey ? 'Pick a background and a meme video'
    : keys.some((k) => uploads[k]?.error) ? 'Upload failed — retry on the left'
    : keys.some(isLocalKey) ? 'Uploading…'
    : !clip.ready ? 'Reading clip length…'
    : !captionText.trim() ? 'Add a caption'
    : mentionBusiness && !businessText.trim() ? 'Add your business line (or pick No)'
    : null;

  const handleDoneEditing = () => {
    if (!selectedTemplate) return;
    void render.submit({
      templateId: selectedTemplate.id,
      currentAssets,
      overlayZoom: overlay.zoom,
      overlayOffsetX: overlay.offsetX,
      overlayOffsetY: overlay.offsetY,
      mentionBusiness,
      businessText: showBusiness ? businessText.trim() : undefined,
      muteVideoAudio,
      durationSeconds: clip.seconds,
      regenPrompt: regenPrompt || undefined,
      captionText,
      textConfigOverride: Object.keys(text.override).length > 0 ? (text.override as Record<string, unknown>) : undefined,
    });
  };

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
            onChange={(e) => { const t = templates.find((x) => x.id === e.target.value); if (t) { initTemplate(t, assets); text.reset(); } }}
            className="rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
          >
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[280px_1fr_220px]">
        {/* Left: assets + copy. Below the canvas on phones so the preview comes first. */}
        <div className="order-2 flex flex-col gap-4 lg:order-none">
          <AssetsPanel
            assets={assets}
            currentAssets={currentAssets}
            uploads={uploads}
            onOpenPicker={(type) => { setPicker(type); setPauseSignal((n) => n + 1); }}
            onRetryUpload={retry}
            onRemoveAudio={() => handleSwapAsset('AUDIO', '')}
            muteVideoAudio={muteVideoAudio}
            onMuteVideoAudioChange={setMuteVideoAudio}
            durationSeconds={clip.seconds}
          />
          <CopyPanel
            mentionBusiness={mentionBusiness}
            onMentionBusinessChange={handleMentionBusinessChange}
            businessText={businessText}
            onBusinessTextChange={setBusinessText}
            captionText={captionText}
            onCaptionChange={setCaptionText}
            regenPrompt={regenPrompt}
            onRegenPromptChange={setRegenPrompt}
            onRegenerateText={handleRegenerateText}
            isRegenerating={isRegenerating}
            regenError={regenError}
          />
        </div>

        {/* Center: preview */}
        <div className="order-1 flex min-w-0 flex-col items-center gap-4 lg:order-none">
          {inputProps && (
            <PreviewPlayer inputProps={inputProps} activeLayer={activeLayer} onSelectLayer={setActiveLayer} onLayerDrag={handleLayerDrag} pauseSignal={pauseSignal} playFromStartSignal={playFromStartSignal} onPlayFromStart={() => setPlayFromStartSignal((n) => n + 1)} />
          )}
          <RenderControls state={render.state} isBusy={render.isBusy} blockedReason={blockedReason} onSubmit={handleDoneEditing} />
        </div>

        {/* Right: context panel for the selected layer */}
        <div className="order-3 lg:order-none">
          <ContextPanel
            activeLayer={activeLayer === 'BUSINESS' && !showBusiness ? 'TEXT' : activeLayer}
            onActiveLayerChange={setActiveLayer}
            showBusiness={showBusiness}
            onResetBusinessPosition={text.resetBusinessPosition}
            overlayZoom={overlay.zoom}
            onZoomChange={(zoom) => setOverlay((prev) => ({ ...prev, zoom }))}
            onResetPosition={() => setOverlay(NO_OVERLAY_MOVE)}
            onSwapOverlay={() => { setPicker('OVERLAY'); setPauseSignal((n) => n + 1); }}
            textConfig={text.resolved}
            onTextConfigChange={text.patch}
            onResetTextPosition={text.resetCaptionPosition}
          />
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-ink">Library</h2>
          <button type="button" onClick={handleRefreshLibrary} className="min-h-9 text-[12px] text-muted underline hover:text-ink">Refresh</button>
        </div>
        <LibraryGrid projects={library} isLoading={libraryLoading && library.length === 0} />
      </section>

      {picker && (
        <AssetLibraryModal
          type={picker}
          assets={assets}
          currentKey={keyForLayer(currentAssets, picker)}
          onSelect={(key) => { handleSwapAsset(picker, key); setPlayFromStartSignal((n) => n + 1); }}
          onPickFile={(file) => handlePickFile(picker, file)}
          onRename={handleRenameAsset}
          onDelete={handleDeleteAsset}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
