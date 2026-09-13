'use client';

import { useEffect, useRef, useState } from 'react';
import type { CreativeDirector } from '../../../types/booking';
import { DirectorNote } from './DirectorNote';
import { GenerationProgressBar } from './GenerationProgressBar';

type PreviewLoaderProps = {
  uploadedPhoto: string;
  director: CreativeDirector;
  note: string | null;
  name: string;
  onNameChange: (name: string) => void;
  /** When true (e.g. studio context with a known name) the name card is hidden */
  hideName?: boolean;
};

const STUDIO_STEPS = [
  'Setting up your studio…',
  'Matching your lighting and mood…',
  'Studio ready.',
  `Composing your first shot…`,
  'Adding the final touches…',
];

const STEP_DURATIONS_MS = [4000, 5000, 2000, 8000, 99999];

const CyclingStep = ({ directorName }: { directorName: string }) => {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let current = 0;

    const advance = () => {
      if (current >= STUDIO_STEPS.length - 1) return;
      // Fade out, then swap text, then fade in
      setVisible(false);
      setTimeout(() => {
        current += 1;
        setIndex(current);
        setVisible(true);
      }, 300);
    };

    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    STEP_DURATIONS_MS.slice(0, -1).forEach((dur) => {
      elapsed += dur;
      timers.push(setTimeout(advance, elapsed));
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  const text = STUDIO_STEPS[index].replace('Composing', `${directorName} is composing`);

  return (
    <p
      className="label-caps text-[10px] font-medium text-accent-strong transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
      aria-live="polite"
    >
      {text}
    </p>
  );
};

export const PreviewLoader = ({
  uploadedPhoto,
  director,
  note,
  name,
  onNameChange,
  hideName = false,
}: PreviewLoaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = () => {
    if (!name.trim()) return;
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setSaved(true);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  };

  useEffect(() => () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); }, []);

  return (
    <div className="flex min-h-full flex-col items-center gap-6 py-10 text-center">
      {/* Pulsing selfie avatar */}
      <div className="relative h-20 w-20 shrink-0">
        <span className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
        <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 p-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={uploadedPhoto} alt="" className="h-full w-full rounded-full object-cover" />
        </span>
      </div>

      {/* Single animated step label */}
      <CyclingStep directorName={director.name} />

      {/* Name capture — hidden if the name is already known */}
      {!hideName && (
        <div className="w-full max-w-[380px] rounded-2xl border border-line bg-surface px-5 py-5 text-left">
          <p className="font-serif text-[18px] leading-snug text-ink">
            What&apos;s your name?
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              autoComplete="given-name"
              placeholder="Your first name"
              value={name}
              onChange={(e) => { setSaved(false); onNameChange(e.target.value); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              className="min-w-0 flex-1 rounded-xl border border-line bg-page px-4 py-3 text-[14px] text-ink placeholder:text-muted/50 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
            />
            {saved ? (
              <span className="shrink-0 text-[12px] font-medium text-green-600 transition-opacity">Saved!</span>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={!name.trim()}
                className="shrink-0 rounded-xl bg-accent px-3 py-3 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-80 disabled:opacity-30"
              >
                Save
              </button>
            )}
          </div>
        </div>
      )}

      {/* Director note streams in while we wait */}
      <div className="w-full max-w-[380px]">
        <DirectorNote director={director} note={note} stream />
      </div>

      <div className="w-full max-w-[380px]">
        <GenerationProgressBar />
      </div>
    </div>
  );
};
