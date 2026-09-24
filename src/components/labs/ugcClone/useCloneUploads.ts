'use client';

/**
 * The three files a clone is made from: the character photo, the reference video and an optional
 * voice sample. Each one uploads to the lab, comes back with signed links, and keeps a local blob
 * URL so the preview appears before the round trip finishes.
 */

import { useCallback, useRef, useState } from 'react';
import { errorOf } from '../labClient';
import { useLabClient } from '../LabClientProvider';
import type { ResearchVideo } from '../ugcLab/researchCache';
import { readVideoDuration, type CloneDuration, type CloneUpload, type CloneVoice } from './cloneConfig';

type UploadResponse = {
  key?: string;
  vendorUrl?: string;
  browserUrl?: string;
  voiceUrl?: string;
  voiceVendorUrl?: string;
  trimmed?: boolean;
  durationSeconds?: number;
  frameKey?: string;
  frameVendorUrl?: string;
};

type Options = {
  /** The duration the reference video is trimmed to. */
  maxDurationSec: CloneDuration;
  /** A voice was added or removed — the prompt may need to change. */
  onVoiceChanged?: (hasVoice: boolean) => void;
  /** A reference video was pulled from a researched URL rather than uploaded. */
  onSourcedFromUrl?: () => void;
};

const revoke = (url: string | undefined) => {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
};

export function useCloneUploads({ maxDurationSec, onVoiceChanged, onSourcedFromUrl }: Options) {
  const client = useLabClient();

  const [character, setCharacter] = useState<CloneUpload | null>(null);
  const [characterBusy, setCharacterBusy] = useState(false);
  const [characterError, setCharacterError] = useState('');

  const [refVideo, setRefVideo] = useState<CloneUpload | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoError, setVideoError] = useState('');

  const [voice, setVoice] = useState<CloneVoice | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceError, setVoiceError] = useState('');

  /** Set while a researched video is being downloaded, so its card can show a spinner. */
  const [sourceLoadingId, setSourceLoadingId] = useState<string | null>(null);
  /** The last picked video file, so changing the duration cap can re-upload and re-trim it. */
  const videoFileRef = useRef<File | null>(null);

  const post = useCallback(
    (path: string, init: { form?: FormData; json?: unknown }) =>
      client.request<UploadResponse>(path, init).catch(() => null),
    [client],
  );

  const uploadCharacter = useCallback(async (file: File) => {
    setCharacterBusy(true);
    setCharacterError('');
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', 'character');
    const res = await post('/ugc-lab/clone/upload', { form });
    setCharacterBusy(false);
    if (res?.ok && res.data.key && res.data.vendorUrl) {
      setCharacter((prev) => {
        revoke(prev?.previewUrl);
        return { key: res.data.key!, vendorUrl: res.data.vendorUrl!, previewUrl: URL.createObjectURL(file) };
      });
    } else {
      setCharacterError(res ? errorOf(res) : 'Upload failed');
    }
  }, [post]);

  const uploadVideo = useCallback(async (file: File, capSec?: CloneDuration) => {
    setVideoBusy(true);
    setVideoError('');
    const durationSec = await readVideoDuration(file);
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', 'video');
    form.append('maxDuration', String(capSec ?? maxDurationSec));
    const res = await post('/ugc-lab/clone/upload', { form });
    setVideoBusy(false);
    if (res?.ok && res.data.key && res.data.vendorUrl) {
      videoFileRef.current = file;
      setRefVideo((prev) => {
        revoke(prev?.previewUrl);
        return {
          key: res.data.key!,
          vendorUrl: res.data.vendorUrl!,
          previewUrl: URL.createObjectURL(file),
          durationSec,
          frameVendorUrl: res.data.frameVendorUrl,
        };
      });
    } else {
      setVideoError(res ? errorOf(res) : 'Upload failed');
    }
  }, [post, maxDurationSec]);

  const uploadVoice = useCallback(async (file: File) => {
    setVoiceBusy(true);
    setVoiceError('');
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', 'voice');
    const res = await post('/ugc-lab/clone/upload', { form });
    setVoiceBusy(false);
    if (res?.ok && res.data.key && res.data.voiceUrl) {
      setVoice((prev) => {
        revoke(prev?.previewUrl);
        return {
          key: res.data.key!,
          voiceUrl: res.data.voiceUrl!,
          voiceVendorUrl: res.data.voiceVendorUrl ?? res.data.voiceUrl!,
          previewUrl: URL.createObjectURL(file),
        };
      });
      onVoiceChanged?.(true);
    } else {
      setVoiceError(res ? errorOf(res) : 'Upload failed');
    }
  }, [post, onVoiceChanged]);

  const removeVoice = useCallback(() => {
    setVoice((prev) => { revoke(prev?.previewUrl); return null; });
    onVoiceChanged?.(false);
  }, [onVoiceChanged]);

  /** Pull a researched TikTok straight into the reference slot, trimmed server-side. */
  const sourceFromUrl = useCallback(async (video: ResearchVideo) => {
    setSourceLoadingId(video.id);
    setVideoError('');
    const res = await post('/ugc-lab/clone/source-from-url', {
      json: { videoUrl: video.video_url, maxDuration: maxDurationSec },
    });
    setSourceLoadingId(null);
    if (res?.ok && res.data.key && res.data.vendorUrl) {
      videoFileRef.current = null;
      setRefVideo((prev) => {
        revoke(prev?.previewUrl);
        return {
          key: res.data.key!,
          vendorUrl: res.data.vendorUrl!,
          // No local blob for a sourced video — the editor shows a badge instead of a player.
          previewUrl: '',
          durationSec: res.data.durationSeconds,
          frameVendorUrl: res.data.frameVendorUrl,
        };
      });
      onSourcedFromUrl?.();
    } else {
      setVideoError(res ? errorOf(res) : 'Failed to download the TikTok video. Please try again.');
    }
  }, [post, maxDurationSec, onSourcedFromUrl]);

  /** Re-upload the picked video so the server trims it to a newly chosen cap. */
  const retrimVideo = useCallback((capSec: CloneDuration) => {
    if (videoFileRef.current) void uploadVideo(videoFileRef.current, capSec);
  }, [uploadVideo]);

  const reset = useCallback(() => {
    setCharacter((prev) => { revoke(prev?.previewUrl); return null; });
    setRefVideo((prev) => { revoke(prev?.previewUrl); return null; });
    setVoice((prev) => { revoke(prev?.previewUrl); return null; });
    videoFileRef.current = null;
    setCharacterError('');
    setVideoError('');
    setVoiceError('');
  }, []);

  return {
    character, characterBusy, characterError, uploadCharacter,
    refVideo, videoBusy, videoError, uploadVideo, retrimVideo,
    voice, voiceBusy, voiceError, uploadVoice, removeVoice,
    sourceFromUrl, sourceLoadingId,
    reset,
  };
}
