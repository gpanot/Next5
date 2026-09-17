'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Captions, Download } from 'lucide-react';

type RunStatus = 'pending' | 'processing' | 'completed' | 'failed';

type RunCardProps = {
  token: string;
  taskId: string;
  estimatedCostUsd: number;
};

const STATUS_LABELS: Record<RunStatus, string> = {
  pending: 'Queued',
  processing: 'Generating…',
  completed: 'Done',
  failed: 'Failed',
};

export function RunCard({ token, taskId, estimatedCostUsd }: RunCardProps) {
  const [status, setStatus] = useState<RunStatus>('pending');
  const [videoUrl, setVideoUrl] = useState('');
  const [captionedUrl, setCaptionedUrl] = useState('');
  const [captionError, setCaptionError] = useState('');
  const [burningCaptions, setBurningCaptions] = useState(false);
  const [pollError, setPollError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/ugc-lab/status/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as {
        status?: string;
        video_url?: string;
        error?: string;
      };

      const s = (data.status ?? 'pending') as RunStatus;
      setStatus(s);
      if (data.video_url) setVideoUrl(data.video_url);

      if (s === 'completed' || s === 'failed') {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    } catch {
      setPollError('Polling error — retrying…');
    }
  }, [taskId, token]);

  useEffect(() => {
    void poll();
    intervalRef.current = setInterval(() => { void poll(); }, 10_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [poll]);

  async function handleBurnCaptions() {
    setBurningCaptions(true);
    setCaptionError('');

    try {
      const res = await fetch(`/api/admin/ugc-lab/captions/${taskId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = (await res.json()) as {
        captioned_url?: string;
        transcript?: string;
        error?: string;
      };

      if (!res.ok || data.error) {
        setCaptionError(data.error ?? `Failed (${res.status})`);
        return;
      }

      setCaptionedUrl(data.captioned_url ?? '');
    } catch (e) {
      setCaptionError(e instanceof Error ? e.message : 'Caption error');
    } finally {
      setBurningCaptions(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          {status === 'processing' || status === 'pending' ? (
            <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
          ) : status === 'completed' ? (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
          <span className="text-sm font-medium text-white">{STATUS_LABELS[status]}</span>
          <span className="text-xs text-zinc-500 font-mono">{taskId.slice(0, 16)}…</span>
        </div>
        <span className="text-xs text-zinc-400">est. ${estimatedCostUsd.toFixed(2)}</span>
      </div>

      {/* Progress bar while processing */}
      {(status === 'pending' || status === 'processing') && (
        <div className="w-full h-1 bg-zinc-800 overflow-hidden">
          <div className="h-full bg-white/30 animate-pulse" style={{ width: '60%' }} />
        </div>
      )}

      {/* Video player */}
      {status === 'completed' && (videoUrl || captionedUrl) && (
        <div className="p-4 space-y-3">
          <div className="flex gap-4">
            {/* Raw video */}
            {videoUrl && !captionedUrl && (
              <div className="flex-1 space-y-2">
                <p className="text-xs text-zinc-500">Raw video</p>
                <video
                  src={videoUrl}
                  controls
                  playsInline
                  className="w-full rounded-lg max-h-[480px] bg-black"
                />
              </div>
            )}

            {/* Side by side if both ready */}
            {videoUrl && captionedUrl && (
              <>
                <div className="flex-1 space-y-2">
                  <p className="text-xs text-zinc-500">Raw</p>
                  <video src={videoUrl} controls playsInline className="w-full rounded-lg max-h-[360px] bg-black" />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-xs text-zinc-500">Captioned</p>
                  <video src={captionedUrl} controls playsInline className="w-full rounded-lg max-h-[360px] bg-black" />
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {videoUrl && !captionedUrl && (
              <button
                onClick={handleBurnCaptions}
                disabled={burningCaptions}
                className="flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600 disabled:opacity-50 transition-colors"
              >
                {burningCaptions ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Captions className="w-4 h-4" />
                )}
                {burningCaptions ? 'Burning captions…' : 'Burn captions'}
              </button>
            )}

            {(captionedUrl || videoUrl) && (
              <a
                href={captionedUrl || videoUrl}
                download={`ugc-${taskId.slice(0, 8)}.mp4`}
                className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
            )}
          </div>

          {captionError && (
            <p className="text-xs text-red-400">{captionError}</p>
          )}
        </div>
      )}

      {status === 'failed' && (
        <div className="px-4 py-3 text-sm text-red-400">
          Task failed. Check server logs or try regenerating.
        </div>
      )}

      {pollError && (
        <div className="px-4 py-2 text-xs text-zinc-500">{pollError}</div>
      )}
    </div>
  );
}
