'use client';

/**
 * Blitz Lab — Admin Tab
 *
 * Three-panel editor (assets left, player center, context right) + library grid below.
 *
 * All editing state is local (no draft DB saves). The single DB write happens when
 * "Done Editing" is clicked: POST /api/admin/blitz/render creates the BlitzProject
 * and sets renderStatus=PENDING atomically. The Railway worker picks it up and renders.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { BLITZ_POLL_INTERVAL_MS, BLITZ_DEFAULT_TEXT_CONFIG } from '../../../config/blitzLab';
import type { GreenScreenProps } from '../../../remotion/types';
import { AssetsPanel } from './blitzLab/AssetsPanel';
import { PreviewPlayer } from './blitzLab/PreviewPlayer';
import { ContextPanel } from './blitzLab/ContextPanel';
import { LibraryGrid } from './blitzLab/LibraryGrid';
import { blitzApi, type BlitzAssetDto, type BlitzTemplateDto } from './blitzLab/api';

type Props = { token: string };

type CurrentAssets = {
  backgroundKey: string;
  overlayKey: string;
  audioKey?: string;
};

type RenderState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'polling'; projectId: string }
  | { phase: 'done'; projectId: string }
  | { phase: 'error'; message: string };

// ── helpers ───────────────────────────────────────────────────────────────────

const buildInputProps = (
  template: BlitzTemplateDto,
  assets: BlitzAssetDto[],
  current: CurrentAssets,
  zoom: number,
  offsetX: number,
  offsetY: number,
  caption: string,
): GreenScreenProps => {
  // key is the R2 key; find the signed browser URL for the preview player
  const findUrl = (key: string) => assets.find((a) => a.r2Key === key)?.url ?? key;
  const tc = template.textConfig as typeof BLITZ_DEFAULT_TEXT_CONFIG;
  return {
    backgroundUrl: findUrl(current.backgroundKey),
    overlayUrl: findUrl(current.overlayKey),
    audioUrl: current.audioKey ? findUrl(current.audioKey) : undefined,
    captionText: caption,
    overlayZoom: zoom,
    overlayOffsetX: offsetX,
    overlayOffsetY: offsetY,
    textConfig: {
      font: tc?.font ?? BLITZ_DEFAULT_TEXT_CONFIG.font,
      positionY: tc?.positionY ?? BLITZ_DEFAULT_TEXT_CONFIG.positionY,
      fontSize: tc?.fontSize ?? BLITZ_DEFAULT_TEXT_CONFIG.fontSize,
      safeZonePadding: tc?.safeZonePadding ?? BLITZ_DEFAULT_TEXT_CONFIG.safeZonePadding,
    },
    durationInFrames: Math.round(template.durationSeconds * template.fps),
    fps: template.fps,
  };
};

// ── component ─────────────────────────────────────────────────────────────────

export function BlitzLabTab({ token }: Props) {
  // ── data ──────────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<BlitzTemplateDto[]>([]);
  const [assets, setAssets] = useState<BlitzAssetDto[]>([]);
  const [library, setLibrary] = useState<{ projects: import('./blitzLab/api').BlitzProjectDto[] }>({ projects: [] });
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── editor state (all in-memory, no draft saves) ──────────────────────
  const [selectedTemplate, setSelectedTemplate] = useState<BlitzTemplateDto | null>(null);
  const [currentAssets, setCurrentAssets] = useState<CurrentAssets>({ backgroundKey: '', overlayKey: '' });
  const [overlayZoom, setOverlayZoom] = useState(1.0);
  const [overlayOffsetX, setOverlayOffsetX] = useState(0);
  const [overlayOffsetY, setOverlayOffsetY] = useState(0);
  const [captionText, setCaptionText] = useState('');
  const [mentionBusiness, setMentionBusiness] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState('');
  const [selectedLayer, setSelectedLayer] = useState<'OVERLAY' | 'BACKGROUND' | null>('OVERLAY');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  // ── render state ───────────────────────────────────────────────────────
  const [renderState, setRenderState] = useState<RenderState>({ phase: 'idle' });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── load initial data ──────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      blitzApi.listTemplates(token),
      blitzApi.listAssets(token),
      blitzApi.listCompleted(token),
    ]).then(([tRes, aRes, lRes]) => {
      if (!tRes.ok) { setLoadError(tRes.data.error ?? 'Failed to load templates'); return; }
      if (!aRes.ok) { setLoadError(aRes.data.error ?? 'Failed to load assets'); return; }
      setTemplates(tRes.data.templates ?? []);
      setAssets(aRes.data.assets ?? []);
      setLibrary({ projects: lRes.data.projects ?? [] });
      setLibraryLoading(false);

      // Auto-select the first template
      const first = tRes.data.templates?.[0];
      if (first) initTemplate(first, aRes.data.assets ?? []);
    }).catch(() => setLoadError('Failed to load Blitz Lab data'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const initTemplate = useCallback((template: BlitzTemplateDto, allAssets: BlitzAssetDto[]) => {
    setSelectedTemplate(template);
    // defaultAssets stores R2 keys; fallback to first asset's r2Key
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
    setMentionBusiness(false);
    setRegenPrompt('');
  }, []);

  // ── polling ────────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPolling = useCallback((projectId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const res = await blitzApi.getProject(token, projectId);
      if (!res.ok) return;
      const status = res.data.project?.renderStatus;
      if (status === 'COMPLETED') {
        stopPolling();
        setRenderState({ phase: 'done', projectId });
        setLibrary((prev) => ({
          projects: [res.data.project!, ...prev.projects.filter((p) => p.id !== projectId)],
        }));
      } else if (status === 'FAILED') {
        stopPolling();
        setRenderState({ phase: 'error', message: 'Render failed. Check the worker logs.' });
      }
    }, BLITZ_POLL_INTERVAL_MS);
  }, [token, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── actions ────────────────────────────────────────────────────────────
  const handleSwapAsset = useCallback((type: 'BACKGROUND' | 'OVERLAY', key: string) => {
    setCurrentAssets((prev) =>
      type === 'BACKGROUND' ? { ...prev, backgroundKey: key } : { ...prev, overlayKey: key },
    );
  }, []);

  const handleOffsetChange = useCallback((dx: number, dy: number) => {
    setOverlayOffsetX((prev) => prev + dx);
    setOverlayOffsetY((prev) => prev + dy);
  }, []);

  const handleResetPosition = useCallback(() => {
    setOverlayOffsetX(0);
    setOverlayOffsetY(0);
    setOverlayZoom(1.0);
  }, []);

  const handleRegenerateText = useCallback(async () => {
    setIsRegenerating(true);
    setRegenError(null);
    const res = await blitzApi.generateCaption(token, { captionText, mentionBusiness, regenPrompt });
    setIsRegenerating(false);
    if (res.ok && res.data.caption) {
      setCaptionText(res.data.caption);
    } else {
      setRegenError(res.data.error ?? 'Caption generation failed');
    }
  }, [token, captionText, mentionBusiness, regenPrompt]);

  const handleDoneEditing = useCallback(async () => {
    if (!selectedTemplate) return;
    setRenderState({ phase: 'submitting' });

    const res = await blitzApi.triggerRender(token, {
      templateId: selectedTemplate.id,
      currentAssets,
      overlayZoom,
      overlayOffsetX,
      overlayOffsetY,
      mentionBusiness,
      regenPrompt: regenPrompt || undefined,
      captionText,
    });

    if (!res.ok) {
      setRenderState({ phase: 'error', message: res.data.error ?? 'Render request failed' });
      return;
    }

    const { projectId } = res.data;
    setRenderState({ phase: 'polling', projectId });
    startPolling(projectId);
  }, [
    token, selectedTemplate, currentAssets, overlayZoom, overlayOffsetX,
    overlayOffsetY, mentionBusiness, regenPrompt, captionText, startPolling,
  ]);

  // ── derived ────────────────────────────────────────────────────────────
  const inputProps: GreenScreenProps | null = selectedTemplate
    ? buildInputProps(selectedTemplate, assets, currentAssets, overlayZoom, overlayOffsetX, overlayOffsetY, captionText)
    : null;

  const isRendering = renderState.phase === 'submitting' || renderState.phase === 'polling';

  // ── render ─────────────────────────────────────────────────────────────
  if (loadError) {
    return <p className="text-[13px] text-red-700">{loadError}</p>;
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-[15px] font-semibold text-ink">No templates yet</p>
        <p className="text-[13px] text-muted max-w-sm">
          Run <code className="rounded bg-surface-alt px-1 py-0.5 text-[12px]">npm run db:seed:blitz</code> to seed the first Green Screen template and test assets.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Blitz Lab</h1>
          <p className="text-[13px] text-muted">Layer assets → render a 9:16 video in seconds</p>
        </div>

        {/* Template selector */}
        {templates.length > 1 && (
          <select
            value={selectedTemplate?.id ?? ''}
            onChange={(e) => {
              const t = templates.find((x) => x.id === e.target.value);
              if (t) initTemplate(t, assets);
            }}
            className="rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* ── 3-panel editor ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_240px]">
        {/* Left: Assets panel */}
        <div className="flex flex-col gap-4">
          <AssetsPanel
            assets={assets}
            currentAssets={currentAssets}
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
        <div className="flex flex-col items-center gap-4">
          {inputProps ? (
            <PreviewPlayer inputProps={inputProps} onOffsetChange={handleOffsetChange} />
          ) : (
            <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-dashed border-line">
              <p className="text-[12px] text-muted">Select a template to preview</p>
            </div>
          )}

          {/* ── Done Editing ────────────────────────────────────── */}
          <div className="flex w-full max-w-xs flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleDoneEditing}
              disabled={isRendering || !selectedTemplate || !currentAssets.backgroundKey || !currentAssets.overlayKey}
              className="w-full inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {renderState.phase === 'submitting' && (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {renderState.phase === 'polling' && (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {renderState.phase === 'idle' || renderState.phase === 'done' || renderState.phase === 'error'
                ? 'Done Editing'
                : renderState.phase === 'submitting'
                ? 'Queuing render…'
                : 'Rendering… (polling)'}
            </button>

            {renderState.phase === 'polling' && (
              <p className="text-[12px] text-muted text-center">
                Render queued — the Railway worker will process it. Checking every 4 s…
              </p>
            )}
            {renderState.phase === 'done' && (
              <p className="text-[12px] text-emerald-700 font-medium text-center">
                ✓ Render complete — see library below
              </p>
            )}
            {renderState.phase === 'error' && (
              <p className="text-[12px] text-red-700 text-center">{renderState.message}</p>
            )}
          </div>
        </div>

        {/* Right: Context panel */}
        <ContextPanel
          selectedLayer={selectedLayer}
          overlayZoom={overlayZoom}
          onZoomChange={setOverlayZoom}
          onResetPosition={handleResetPosition}
          onSwapRequest={() => {
            // The AssetsPanel handles the swap modal internally; just toggle the layer selection
            // to make sure the right type is selected. The user can also click swap in AssetsPanel.
            setSelectedLayer((prev) => (prev === 'OVERLAY' ? 'BACKGROUND' : 'OVERLAY'));
          }}
        />
      </div>

      {/* ── Library ─────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-ink">Library</h2>
          <button
            type="button"
            onClick={async () => {
              setLibraryLoading(true);
              const res = await blitzApi.listCompleted(token);
              if (res.ok) setLibrary({ projects: res.data.projects ?? [] });
              setLibraryLoading(false);
            }}
            className="text-[12px] text-muted hover:text-ink underline"
          >
            Refresh
          </button>
        </div>
        <LibraryGrid projects={library.projects} isLoading={libraryLoading && library.projects.length === 0} />
      </section>
    </div>
  );
}
