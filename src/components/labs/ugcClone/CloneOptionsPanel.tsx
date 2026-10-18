'use client';

/** The prompt and whether audio is generated. The mode and the duration have their own steps. */

import { Section } from '../ugcLab/ui';
import { getDefaultPrompt, PROMPTS, type CloneMode } from './cloneConfig';

type Props = {
  mode: CloneMode;

  prompt: string;
  onPromptChange: (prompt: string) => void;
  /** Puts the prompt back under automatic control. */
  onPromptReset: () => void;
  hasVoice: boolean;

  generateAudio: boolean;
  onGenerateAudioChange: (on: boolean) => void;
};

export function CloneOptionsPanel({
  mode,
  prompt, onPromptChange, onPromptReset, hasVoice,
  generateAudio, onGenerateAudioChange,
}: Props) {
  return (
    <>
      <Section
        title="4 · Prompt"
        description={
          mode === 'face-swap'
            ? 'Uses @Image1 (character) and @Video1 (reference) — reference mode, duration = clip length'
            : mode === 'mini-swap'
            ? 'Uses @Image1 (character) and @Video1 (reference) — sent as reference_image_urls / reference_video_urls'
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

      <Section
        title="5 · Original sound"
        description="Controls generate_audio in the API call"
      >
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
