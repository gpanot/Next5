'use client';

/**
 * UGC Clone — research a TikTok, then reshoot it with a different face.
 *
 * Presentational and transport-agnostic: every request goes through the surrounding
 * <LabClientProvider>, so the same editor runs in the admin tab and on the user side.
 */

import { useCallback, useRef, useState } from 'react';
import { EmptyState, ErrorLine, PrimaryButton, SecondaryButton, Section, Spinner } from '../ugcLab/ui';
import { Researcher } from '../shared/Researcher';
import { StepPills } from '../shared/StepPills';
import { ApiPreview } from './ApiPreview';
import { CloneInputsPanel } from './CloneInputsPanel';
import { CloneLibrary } from './CloneLibrary';
import { CloneOptionsPanel } from './CloneOptionsPanel';
import { CloneResult } from './CloneResult';
import { getDefaultPrompt, MODE_CONFIG, PROMPTS, type CloneDuration, type CloneMode } from './cloneConfig';
import { useCloneJob } from './useCloneJob';
import { useCloneUploads } from './useCloneUploads';

const STEPS = [
  { id: 1 as const, label: '1 · Research' },
  { id: 2 as const, label: '2 · UGC Clone' },
];

export function UgcCloneEditor() {
  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<CloneMode>('face-swap');
  const [maxDurationSec, setMaxDurationSec] = useState<CloneDuration>(5);
  const [generateAudio, setGenerateAudio] = useState(true);

  // The prompt follows the mode and the voice until she edits it, and then it is hers.
  const [promptText, setPromptText] = useState(PROMPTS['face-swap'].base);
  const promptEdited = useRef(false);

  const syncPrompt = useCallback((nextMode: CloneMode, hasVoice: boolean) => {
    if (!promptEdited.current) setPromptText(getDefaultPrompt(nextMode, hasVoice));
  }, []);

  const job = useCloneJob();

  const uploads = useCloneUploads({
    maxDurationSec,
    onVoiceChanged: (hasVoice) => syncPrompt(mode, hasVoice),
    onSourcedFromUrl: () => setStep(2),
  });
  const { character, refVideo, voice } = uploads;

  const handleModeChange = (next: CloneMode) => {
    setMode(next);
    syncPrompt(next, Boolean(voice));
  };

  const handleDurationChange = (seconds: CloneDuration) => {
    setMaxDurationSec(seconds);
    uploads.retrimVideo(seconds);
  };

  const handlePromptChange = (next: string) => {
    setPromptText(next);
    promptEdited.current = true;
  };

  const handlePromptReset = () => {
    promptEdited.current = false;
    setPromptText(getDefaultPrompt(mode, Boolean(voice)));
  };

  const reset = () => {
    job.reset();
    uploads.reset();
    promptEdited.current = false;
    setPromptText(getDefaultPrompt(mode, false));
  };

  const generate = () => {
    if (!character || !refVideo) return;
    void job.submit({
      mode,
      imageVendorUrl: character.vendorUrl,
      videoVendorUrl: refVideo.vendorUrl,   // face-swap: sent as video_urls
      frameVendorUrl: refVideo.frameVendorUrl, // video-update: the first_frame role
      voiceVendorUrl: voice?.voiceVendorUrl,
      prompt: promptText.trim(),
      characterKey: character.key,
      refVideoKey: refVideo.key,
      durationSec: maxDurationSec,
      generateAudio,
    });
  };

  const isGenerating = job.status === 'submitting' || job.status === 'polling';
  const canGenerate = Boolean(character && refVideo && promptText.trim()) && !isGenerating;
  const showPreview = Boolean(character && refVideo) && !isGenerating && job.status !== 'done';
  const config = MODE_CONFIG[mode];

  if (job.status === 'done' && job.resultUrl) {
    return (
      <div className="flex flex-col gap-6">
        <CloneResult videoUrl={job.resultUrl} onReset={reset} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <StepPills steps={STEPS} current={step} onChange={setStep} label="UGC Clone steps" />

      {/* ── Step 1: Research ──────────────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[14px] font-semibold text-ink">Find a TikTok to clone</p>
            <p className="mt-0.5 text-[12px] text-muted">
              Search for trending videos, then use one as your reference. &ldquo;See Template&rdquo; shows which
              format it matches.
            </p>
          </div>
          <Researcher
            cacheKey="ugc-clone-research"
            actionLabel="Use as source"
            onAction={(video) => void uploads.sourceFromUrl(video)}
            actionLoadingId={uploads.sourceLoadingId}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-6 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Skip to Clone →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Clone editor ──────────────────────────────────────── */}
      {step === 2 && (
        <div className="flex flex-col gap-6">
          <CloneOptionsPanel
            mode={mode}
            onModeChange={handleModeChange}
            maxDurationSec={maxDurationSec}
            onDurationChange={handleDurationChange}
            prompt={promptText}
            onPromptChange={handlePromptChange}
            onPromptReset={handlePromptReset}
            hasVoice={Boolean(voice)}
            generateAudio={generateAudio}
            onGenerateAudioChange={setGenerateAudio}
          />

          <CloneInputsPanel
            maxDurationSec={maxDurationSec}
            character={character}
            characterBusy={uploads.characterBusy}
            characterError={uploads.characterError}
            onCharacterFile={(f) => void uploads.uploadCharacter(f)}
            refVideo={refVideo}
            videoBusy={uploads.videoBusy}
            videoError={uploads.videoError}
            onVideoFile={(f) => void uploads.uploadVideo(f, maxDurationSec)}
            voice={voice}
            voiceBusy={uploads.voiceBusy}
            voiceError={uploads.voiceError}
            onVoiceFile={(f) => void uploads.uploadVoice(f)}
            onRemoveVoice={uploads.removeVoice}
          />

          <Section title="Generate" description={`${config.label} · ${config.model} · reapi`}>
            {!character && !refVideo && (
              <EmptyState
                title="Upload a character image and a reference video to get started."
                hint="Steps 2 and 3 above."
              />
            )}

            {(character || refVideo) && (
              <div className="flex flex-col gap-4">
                {showPreview && character && refVideo && (
                  <ApiPreview
                    mode={mode}
                    character={character}
                    refVideo={refVideo}
                    voice={voice}
                    prompt={promptText}
                    durationSec={maxDurationSec}
                    generateAudio={generateAudio}
                  />
                )}

                {isGenerating && (
                  <div className="flex items-center gap-3">
                    <Spinner />
                    <span className="text-[13px] text-muted">
                      {job.status === 'submitting'
                        ? 'Submitting to Seedance…'
                        : `Generating… ${job.progress > 0 ? `${job.progress}%` : ''} (${job.elapsedSec}s elapsed)`}
                    </span>
                  </div>
                )}

                {job.error && job.status === 'failed' && (
                  <div className="flex flex-col gap-2">
                    <ErrorLine message={job.error} />
                    <SecondaryButton onClick={job.dismissError}>Try again</SecondaryButton>
                  </div>
                )}

                {(job.status === 'idle' || job.status === 'failed') && (
                  <div className="flex flex-wrap items-center gap-3">
                    <PrimaryButton onClick={generate} disabled={!canGenerate}>
                      {config.label}
                    </PrimaryButton>
                    {!character && <p className="text-[12px] text-red-700">Missing: character image</p>}
                    {!refVideo && <p className="text-[12px] text-red-700">Missing: reference video</p>}
                  </div>
                )}
              </div>
            )}
          </Section>

          {job.taskId && job.status !== 'idle' && (
            <p className="text-[11px] text-muted">
              Task ID: <code className="font-mono">{job.taskId}</code>
            </p>
          )}

          <CloneLibrary />
        </div>
      )}
    </div>
  );
}
