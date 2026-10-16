'use client';

import { useRef, type ReactNode } from 'react';
import type { AppShotBusy, PickedBackground } from './useAppShot';
import { CloseIcon, SearchIcon, SparkIcon, UploadIcon } from './icons';
import { StepTitle } from './StepTitle';

type Props = {
  scene: string;
  background: PickedBackground | null;
  busy: AppShotBusy;
  searching: boolean;
  onScene: (text: string) => void;
  onUpload: (file: File) => void;
  onGenerate: () => void;
  onSearch: () => void;
  onClear: () => void;
};

const HOW: Record<PickedBackground['how'], string> = { upload: 'Your photo', generated: 'Generated scene', search: 'Stock photo' };

type ChoiceProps = { icon: ReactNode; label: string; onClick: () => void; disabled: boolean; on?: boolean; suggested?: boolean };

/** `on`: the way the background was picked. `suggested`: the next tap to make (solid green). */
function Choice({ icon, label, onClick, disabled, on = false, suggested = false }: ChoiceProps) {
  const look = suggested
    ? 'border-emerald-400 bg-emerald-400 text-zinc-950 shadow-sm hover:bg-emerald-300'
    : on
      ? 'border-emerald-400 bg-emerald-400/10 text-white'
      : 'border-white/10 text-white/75 hover:bg-white/5';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-1 text-xs font-medium transition active:scale-95 disabled:opacity-35 ${look}`}
    >
      {icon}
      {label}
    </button>
  );
}

/** Step 3: where the phone is. The text alone gets the best stock photo; Upload, Generate scene (AI) or Search pin it. */
export function SceneStep({ scene, background, busy, searching, onScene, onUpload, onGenerate, onSearch, onClear }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const hasText = scene.trim() !== '';
  // Text typed, nothing picked yet: Search is the next step.
  const suggestSearch = hasText && background === null && !searching && busy === null;
  return (
    <section>
      <StepTitle n={3} title="Scene" done={background !== null || hasText} />
      <textarea
        value={scene}
        onChange={(e) => onScene(e.target.value)}
        maxLength={200}
        rows={3}
        placeholder="Where the phone is, like a sunny golf course"
        className="w-full resize-none rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-base text-white placeholder:text-white/40 focus:border-emerald-400 focus:outline-none"
      />
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Choice icon={<UploadIcon />} label={busy === 'scene-upload' ? 'Uploading…' : 'Upload'} onClick={() => input.current?.click()} disabled={busy !== null} on={background?.how === 'upload'} />
        <Choice icon={<SparkIcon />} label={busy === 'scene-generate' ? 'Making…' : 'Generate'} onClick={onGenerate} disabled={busy !== null || !hasText} on={background?.how === 'generated'} />
        <Choice icon={<SearchIcon />} label="Search" onClick={onSearch} disabled={busy !== null || !hasText} on={searching || background?.how === 'search'} suggested={suggestSearch} />
      </div>
      {background ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={background.thumbUrl} alt="" className="h-16 w-9 rounded-md object-cover" />
          <span className="min-w-0 flex-1 text-sm text-white/80">{HOW[background.how]}</span>
          <button type="button" onClick={onClear} aria-label="Remove background" className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 active:scale-95"><CloseIcon /></button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-white/45">Text alone is enough: we use the best free photo for it. Generate makes one with AI.</p>
      )}
    </section>
  );
}
