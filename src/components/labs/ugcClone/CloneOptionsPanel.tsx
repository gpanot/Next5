'use client';

/** The choices that shape the request: mode, duration, prompt and whether audio is generated. */

import { Section } from '../ugcLab/ui';
import {
  estimateCost,
  getDefaultPrompt,
  MAX_DURATION_OPTIONS,
  MODE_CONFIG,
  PROMPTS,
  type CloneDuration,
  type CloneMode,
} from './cloneConfig';

type Props = {
  mode: CloneMode;
  onModeChange: (mode: CloneMode) => void;

  maxDurationSec: CloneDuration;
  onDurationChange: (seconds: CloneDuration) => void;

  prompt: string;
  onPromptChange: (prompt: string) => void;
  /** Puts the prompt back under automatic control. */
  onPromptReset: () => void;
  hasVoice: boolean;

  generateAudio: boolean;
  onGenerateAudioChange: (on: boolean) => void;
};

export function CloneOptionsPanel({
  mode, onModeChange,
  maxDurationSec, onDurationChange,
  prompt, onPromptChange, onPromptReset, hasVoice,
  generateAudio, onGenerateAudioChange,
}: Props) {
  const config = MODE_CONFIG[mode];

  return (
    <>
      <Section title="UGC Clone" description="Pick a mode, then follow the steps below">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(['face-swap', 'video-update'] as CloneMode[]).map((m) => {
            const c = MODE_CONFIG[m];
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => onModeChange(m)}
                className={`flex flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition-colors ${
                  active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:bg-surface-alt'
                }`}
              >
                <span className="text-[14px] font-semibold">{c.label}</span>
                <span className={`font-mono text-[10px] ${active ? 'text-white/60' : 'text-muted'}`}>{c.model}</span>
                <span className={`text-[11px] leading-snug ${active ? 'text-white/80' : 'text-muted'}`}>{c.hint}</span>
              </button>
            );
          })}
        </div>
        {config.billingNote && (
          <p className="mt-2 rounded-lg bg-orange-50 px-3 py-2 text-[12px] text-orange-800">{config.billingNote}</p>
        )}
      </Section>

      <Section
        title="1 · Duration"
        description={
          mode === 'face-swap'
            ? 'Reference video is trimmed to this length — output matches the trimmed input'
            : 'How many seconds to generate — sent explicitly to the API'
        }
      >
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {MAX_DURATION_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onDurationChange(s)}
              className={`flex flex-col items-center justify-center rounded-xl border py-3 text-[13px] font-medium transition-colors ${
                maxDurationSec === s ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:bg-surface-alt'
              }`}
            >
              <span className="text-[15px] font-semibold">{s}s</span>
              <span className={`text-[11px] ${maxDurationSec === s ? 'text-white/70' : 'text-muted'}`}>
                ≈ {estimateCost(s)}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="5 · Prompt"
        description={
          mode === 'face-swap'
            ? 'Uses @Image1 (character) and @Video1 (reference) — editing mode, duration: -1'
            : 'Uses @Image1 (character) only — generation mode, explicit duration'
        }
      >
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          rows={5}
          className="w-full rounded-xl border border-line bg-white p-3 text-[13px] text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ink/20"
          placeholder="Describe what Seedance should do…"
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onPromptReset} className="text-[11px] text-muted underline-offset-2 hover:underline">
            Reset to default
          </button>
          {hasVoice && (
            <>
              <span className="text-[11px] text-muted">·</span>
              <button
                type="button"
                onClick={() => onPromptChange(PROMPTS[mode].base)}
                className="text-[11px] text-muted underline-offset-2 hover:underline"
              >
                Without audio
              </button>
              <span className="text-[11px] text-muted">·</span>
              <button
                type="button"
                onClick={() => onPromptChange(getDefaultPrompt(mode, true))}
                className="text-[11px] text-muted underline-offset-2 hover:underline"
              >
                With audio
              </button>
            </>
          )}
        </div>
      </Section>

      <Section title="6 · Original sound" description="Controls generate_audio in the API call">
        <button
          type="button"
          role="switch"
          aria-checked={generateAudio}
          onClick={() => onGenerateAudioChange(!generateAudio)}
          className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
            generateAudio ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:bg-surface-alt'
          }`}
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium">Keep the original video sound</span>
            <span className={`text-[11px] ${generateAudio ? 'text-white/70' : 'text-muted'}`}>
              {generateAudio
                ? 'generate_audio: true — Seedance will include audio in the output'
                : 'generate_audio: false — video only, no audio generated'}
            </span>
          </div>
          <div className={`relative ml-4 h-6 w-11 shrink-0 rounded-full transition-colors ${generateAudio ? 'bg-white/30' : 'bg-zinc-200'}`}>
            <div className={`absolute top-0.5 h-5 w-5 rounded-full shadow transition-transform ${generateAudio ? 'translate-x-5 bg-white' : 'translate-x-0.5 bg-zinc-400'}`} />
          </div>
        </button>
      </Section>
    </>
  );
}
