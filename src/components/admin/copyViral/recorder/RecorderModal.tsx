'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CopyViralShot } from '../../../../types/admin/copyViral';
import { saveShotText, secondsLabel, uploadClip } from '../useCopyViral';
import { RecorderSettings, TEXT_SCALE, type Framing, type PreviewSize } from './RecorderSettings';
import { scriptWords, Teleprompter } from './Teleprompter';
import { useAudioLevel } from './useAudioLevel';
import { useMediaDevices, type StreamInfo } from './useMediaDevices';
import { useRecorder } from './useRecorder';
import { useStoredState } from './useStoredState';
import { useVoiceFollow, voiceFollowSupported } from './useVoiceFollow';

type Props = { token: string; projectId: string; shots: CopyViralShot[]; startIndex: number; onClose: () => void; onSaved: () => void };

const PREVIEW_W: Record<Framing, Record<PreviewSize, string>> = {
  '9:16': { small: 'w-40', medium: 'w-56', large: 'w-80' },
  '16:9': { small: 'w-64', medium: 'w-96', large: 'w-[32rem]' },
};
const ASPECT: Record<Framing, string> = { '9:16': 'aspect-[9/16]', '16:9': 'aspect-video' };

const isScale = (v: unknown): v is number => typeof v === 'number' && v >= TEXT_SCALE.min && v <= TEXT_SCALE.max;
const isFraming = (v: unknown): v is Framing => v === '9:16' || v === '16:9';

const badge = (info: StreamInfo | null) => (info ? `${Math.min(info.width, info.height)}p · ${info.fps} fps` : '…');

/**
 * Live camera, mirrored like a selfie (the file is not). 9:16 is cropped as the edit crops it; wide shows the camera's
 * whole picture, uncropped.
 */
function CameraPreview({ stream, info, size, framing, recording }: { stream: MediaStream | null; info: StreamInfo | null; size: PreviewSize; framing: Framing; recording: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (video.current) video.current.srcObject = stream;
  }, [stream]);
  return (
    <div className={`absolute right-6 bottom-28 ${PREVIEW_W[framing][size]} overflow-hidden rounded-2xl border-2 shadow-2xl ${recording ? 'border-red-500' : 'border-white/20'}`}>
      <video
        ref={video}
        autoPlay
        muted
        playsInline
        style={framing === '16:9' && info?.width && info.height ? { aspectRatio: `${info.width} / ${info.height}` } : undefined}
        className={`${ASPECT[framing]} w-full -scale-x-100 bg-black ${framing === '16:9' ? 'object-contain' : 'object-cover'}`}
      />
      <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1">
        {recording && <span className="flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white"><span className="h-2 w-2 rounded-full bg-red-500" />REC</span>}
        <span className="ml-auto rounded-md bg-black/70 px-2 py-0.5 font-mono text-[11px] text-white">{badge(info)}</span>
      </div>
    </div>
  );
}

/** Full-screen recorder: teleprompter + camera, one shot at a time; a kept take uploads to that shot. */
export function RecorderModal({ token, projectId, shots, startIndex, onClose, onSaved }: Props) {
  const [index, setIndex] = useState(startIndex);
  const [showPreview, setShowPreview] = useState(true);
  const [previewSize, setPreviewSize] = useState<PreviewSize>('small');
  const [textScale, setTextScale] = useStoredState('copyViral.textScale', 1, isScale);
  const [framing, setFraming] = useStoredState<Framing>('copyViral.framing', '9:16', isFraming);
  const [follow, setFollow] = useState(voiceFollowSupported());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const devices = useMediaDevices(framing === '16:9');
  const level = useAudioLevel(devices.stream);
  const rec = useRecorder(devices.stream);
  // lines edited in the teleprompter, shown until the project reloads with them
  const [edited, setEdited] = useState<Record<string, string>>({});
  const lineOf = (s: CopyViralShot) => (edited[`${s.index}-${s.startMs}`] ?? s.myLine) || s.transcript || '';
  const shot = shots[index];
  const text = shot ? lineOf(shot) : '';
  const words = useMemo(() => scriptWords(text), [text]);
  const busy = rec.state === 'countdown' || rec.state === 'recording';
  // the speech engine loads once the camera is open, not during the first take (useRecorder warms the encoder)
  const read = useVoiceFollow(words, follow && busy, follow && devices.stream !== null);

  const go = (i: number) => !busy && rec.state !== 'review' && i >= 0 && i < shots.length && setIndex(i);

  const saveLine = async (myLine: string) => {
    if (!shot) return;
    await saveShotText(token, projectId, shot.index, shot.startMs, { myLine });
    setEdited((e) => ({ ...e, [`${shot.index}-${shot.startMs}`]: myLine }));
    onSaved();
  };

  const keep = async () => {
    if (!rec.take || !shot) return;
    setSaving(true);
    setError(null);
    try {
      await uploadClip(token, projectId, shot.index, shot.startMs, rec.take.file);
      onSaved();
      rec.discard();
      const nextEmpty = shots.findIndex((s, i) => i > index && !s.clip);
      if (nextEmpty >= 0) setIndex(nextEmpty);
      else if (index < shots.length - 1) setIndex(index + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('select, textarea, input')) return;
      if (e.key === ' ') {
        e.preventDefault();
        if (rec.state === 'idle') rec.start();
        else if (busy) rec.stop();
      } else if (e.key === 'Escape' && !busy) onClose();
      else if (e.key === 'ArrowRight') go(index + 1);
      else if (e.key === 'ArrowLeft') go(index - 1);
      else if (e.key.toLowerCase() === 'v') setShowPreview((v) => !v);
      else if (e.key.toLowerCase() === 's' && voiceFollowSupported()) setFollow((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!shot) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-neutral-950 text-white">
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3 text-sm">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg px-2 py-1 text-white/60 hover:text-white disabled:opacity-30">✕ Close</button>
          <span className="text-white/40">·</span>
          <span className="font-semibold">Shot {index + 1} of {shots.length}</span>
          <span className="text-white/50">target {secondsLabel(shot.targetMs)}{shot.clip ? ' · has a take' : ''}</span>
          <div className="ml-auto flex gap-1">
            <button type="button" onClick={() => go(index - 1)} disabled={busy || index === 0} className="rounded-lg border border-white/15 px-3 py-1 hover:bg-white/10 disabled:opacity-30">← Prev</button>
            <button type="button" onClick={() => go(index + 1)} disabled={busy || index === shots.length - 1} className="rounded-lg border border-white/15 px-3 py-1 hover:bg-white/10 disabled:opacity-30">Next →</button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <Teleprompter
            key={index}
            index={index}
            text={text}
            onScreenText={shot.myOnScreenText}
            next={shots[index + 1] ? lineOf(shots[index + 1]) : null}
            read={read}
            follow={follow && rec.state === 'recording'}
            scale={textScale}
            editable={rec.state === 'idle'}
            onSave={saveLine}
          />
          {rec.state === 'countdown' && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 text-[160px] font-black">{rec.count}</div>
          )}
        </div>
        {showPreview && rec.state !== 'review' && <CameraPreview stream={devices.stream} info={devices.info} size={previewSize} framing={framing} recording={rec.state === 'recording'} />}

        {rec.state === 'review' && rec.take && (
          <div className="absolute inset-0 top-12 bottom-24 flex items-center justify-center bg-black/80 p-6">
            {/* framed like the preview */}
            <video src={rec.take.url} controls autoPlay playsInline className={`max-h-full max-w-full rounded-2xl bg-black ${framing === '9:16' ? 'aspect-[9/16] h-full object-cover' : 'object-contain'}`} />
          </div>
        )}

        <div className="flex min-h-24 items-center justify-center gap-4 border-t border-white/10 px-5">
          {devices.error && <p className="text-sm text-red-400">{devices.error}: allow the camera and microphone for localhost.</p>}
          {!devices.error && rec.state === 'idle' && (
            <button type="button" onClick={rec.start} disabled={!devices.stream} className="flex items-center gap-2 rounded-full bg-red-500 px-7 py-3 text-base font-bold transition hover:bg-red-400 disabled:opacity-40">
              <span className="h-3 w-3 rounded-full bg-white" /> Record <kbd className="ml-1 text-xs opacity-70">Space</kbd>
            </button>
          )}
          {busy && (
            <button type="button" onClick={rec.stop} className="flex items-center gap-3 rounded-full bg-white px-7 py-3 text-base font-bold text-black">
              <span className="h-3 w-3 rounded-sm bg-red-500" /> Stop <span className="font-mono">{secondsLabel(rec.elapsedMs)}</span>
            </button>
          )}
          {rec.state === 'review' && (
            <>
              <button type="button" onClick={rec.discard} disabled={saving} className="rounded-full border border-white/20 px-6 py-3 font-semibold hover:bg-white/10 disabled:opacity-40">Retake</button>
              <button type="button" onClick={keep} disabled={saving} className="rounded-full bg-white px-7 py-3 font-bold text-black disabled:opacity-60">
                {saving ? 'Uploading…' : `Use this take for shot ${index + 1}`}
              </button>
            </>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>

      <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-white/10 bg-neutral-900 lg:block">
        <RecorderSettings
          cameras={devices.cameras} mics={devices.mics} cameraId={devices.cameraId} micId={devices.micId}
          onCamera={devices.setCameraId} onMic={devices.setMicId} level={level}
          showPreview={showPreview} onShowPreview={setShowPreview} previewSize={previewSize} onPreviewSize={setPreviewSize}
          textScale={textScale} onTextScale={setTextScale} framing={framing} onFraming={setFraming}
          follow={follow} onFollow={setFollow} followSupported={voiceFollowSupported()} locked={busy}
        />
      </aside>
    </div>
  );
}
