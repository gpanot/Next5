'use client';

import type { DeviceOption } from './useMediaDevices';
import { levelLabel } from './useAudioLevel';

export type PreviewSize = 'small' | 'medium' | 'large';

/** How the take is framed: 9:16 for full-camera shots, 16:9 for shots where the camera sits in the lower half (split). */
export type Framing = '9:16' | '16:9';

export const TEXT_SCALE = { min: 0.5, max: 1.2, step: 0.05 };

type Props = {
  cameras: DeviceOption[];
  mics: DeviceOption[];
  cameraId: string;
  micId: string;
  onCamera: (id: string) => void;
  onMic: (id: string) => void;
  level: number;
  showPreview: boolean;
  onShowPreview: (v: boolean) => void;
  previewSize: PreviewSize;
  onPreviewSize: (v: PreviewSize) => void;
  textScale: number;
  onTextScale: (v: number) => void;
  framing: Framing;
  onFraming: (v: Framing) => void;
  follow: boolean;
  onFollow: (v: boolean) => void;
  followSupported: boolean;
  locked: boolean;
};

const select = 'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-white/40 disabled:opacity-50';
const heading = 'text-[11px] font-bold tracking-widest text-white/40 uppercase';

function Toggle({ on, onChange, label, hotkey, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; hotkey: string; disabled?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-white">
      {label}
      <span className="flex items-center gap-2">
        <kbd className="rounded border border-white/15 px-1.5 text-[11px] text-white/50">{hotkey}</kbd>
        <button type="button" disabled={disabled} onClick={() => onChange(!on)} className={`relative h-6 w-11 rounded-full transition disabled:opacity-40 ${on ? 'bg-blue-500' : 'bg-white/15'}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </span>
    </label>
  );
}

function Segmented<T extends string>({ options, value, onChange, disabled }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; disabled?: boolean }) {
  return (
    <div className="grid rounded-lg border border-white/10 bg-white/5 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.id} type="button" disabled={disabled} onClick={() => onChange(o.id)} className={`rounded-md py-1.5 text-sm transition disabled:opacity-40 ${value === o.id ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white'}`}>{o.label}</button>
      ))}
    </div>
  );
}

/** Right panel of the recorder: devices, input level, framing, camera preview, text size and voice follow. */
export function RecorderSettings(p: Props) {
  const bars = 20;
  const lit = Math.round(p.level * bars);
  return (
    <div className="space-y-6 p-5">
      <p className="text-base font-bold text-white">Settings</p>
      <div className="space-y-3">
        <p className={heading}>Camera & microphone</p>
        <label className="block space-y-1.5 text-sm text-white/70">
          Camera
          <select className={select} value={p.cameraId} disabled={p.locked} onChange={(e) => p.onCamera(e.target.value)}>
            {!p.cameraId && <option value="">Default camera</option>}
            {p.cameras.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label className="block space-y-1.5 text-sm text-white/70">
          Microphone
          <select className={select} value={p.micId} disabled={p.locked} onChange={(e) => p.onMic(e.target.value)}>
            {!p.micId && <option value="">Default microphone</option>}
            {p.mics.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
        <div className="space-y-1.5 text-sm text-white/70">
          Input level
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
            <div className="flex gap-0.5">
              {Array.from({ length: bars }, (_, i) => (
                <span key={i} className={`h-4 w-1 rounded-sm ${i < lit ? (i > bars * 0.85 ? 'bg-red-400' : 'bg-green-400') : 'bg-white/10'}`} />
              ))}
            </div>
            <span className="text-white">{levelLabel(p.level)}</span>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <p className={heading}>Framing</p>
        <Segmented options={[{ id: '9:16', label: '9:16 vertical' }, { id: '16:9', label: '16:9 wide' }]} value={p.framing} onChange={p.onFraming} disabled={p.locked} />
        <p className="text-xs leading-relaxed text-white/45">
          {p.framing === '16:9'
            ? 'Wide: frame yourself for the camera card in the lower half of split shots. The whole camera picture is kept.'
            : 'Vertical: the edit keeps the middle 9:16 of the camera picture, as the preview shows.'}
        </p>
      </div>
      <div className="space-y-3">
        <Toggle label="Show camera preview" hotkey="V" on={p.showPreview} onChange={p.onShowPreview} />
        <div className="space-y-1.5 text-sm text-white/70">
          Preview size
          <Segmented options={[{ id: 'small', label: 'Small' }, { id: 'medium', label: 'Medium' }, { id: 'large', label: 'Large' }]} value={p.previewSize} onChange={p.onPreviewSize} />
        </div>
      </div>
      <div className="space-y-1.5 text-sm text-white/70">
        <p className="flex justify-between">Text size <span className="text-white">{Math.round(p.textScale * 100)}%</span></p>
        <input
          type="range"
          min={TEXT_SCALE.min}
          max={TEXT_SCALE.max}
          step={TEXT_SCALE.step}
          value={p.textScale}
          onChange={(e) => p.onTextScale(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
      </div>
      <div className="space-y-3">
        <p className={heading}>Voice follow</p>
        <Toggle label="Follow my voice" hotkey="S" on={p.follow} onChange={p.onFollow} disabled={!p.followSupported} />
        <p className="text-xs leading-relaxed text-white/45">
          {p.followSupported
            ? 'The words light up as you say them. It listens from the countdown to the stop (Chrome speech recognition).'
            : 'Voice follow needs Chrome.'}
        </p>
      </div>
      <p className="text-xs leading-relaxed text-white/45">Keys: Space record / stop · ← → shot · Esc close.</p>
    </div>
  );
}
