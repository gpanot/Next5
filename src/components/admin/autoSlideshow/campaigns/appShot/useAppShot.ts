'use client';

import { useCallback, useEffect, useState } from 'react';
import { APP_SHOT_POSES, type AppShotPoseId } from '../../../../../config/appShotPoses';
import type { AppShotAssetDto, AppShotBackground, PhotoOptionDto } from '../../../../../types/admin/slideshowCampaign';
import { adminFetch } from '../../../business/useAdminApi';
import { MAX_RAW_BYTES, shrinkPhoto } from '../../brand/shrinkPhoto';

/** The background picked for the scene, with its thumb: an upload, a generated scene, or an Unsplash photo. */
export type PickedBackground = { bg: NonNullable<AppShotBackground>; thumbUrl: string; how: 'upload' | 'generated' | 'search' };

/** What is running: an upload, a scene being generated, or the build. */
export type AppShotBusy = 'screen' | 'scene-upload' | 'scene-generate' | 'build' | 'delete' | null;

/** Multipart POST (adminFetch sends JSON only). */
const uploadAsset = async (token: string, path: string, file: File, kind: 'screen' | 'scene'): Promise<AppShotAssetDto> => {
  const small = await shrinkPhoto(file);
  if (small.size > MAX_RAW_BYTES) throw new Error(`${file.name} is too big. Try a JPG or PNG.`);
  const form = new FormData();
  form.append('file', small);
  form.append('kind', kind);
  const res = await fetch(path, { method: 'POST', body: form, headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
  if (!res) throw new Error('Could not reach the server. Check your connection.');
  const data = (await res.json().catch(() => ({}))) as { asset?: AppShotAssetDto; message?: string };
  if (!res.ok || !data.asset) throw new Error(data.message ?? `Upload failed (${res.status})`);
  return data.asset;
};

/**
 * The App shot builder's state: the pose, the app screenshot (the workspace's last one to start), the scene text and
 * its background, and the App shots made before. `build` makes the image on the server and hands back a picker option.
 */
export const useAppShot = (token: string, campaignId: string) => {
  const base = `/api/slideshow/campaigns/${campaignId}/app-shot`;
  const [pose, setPose] = useState<AppShotPoseId>(APP_SHOT_POSES[0]!.id);
  const [screen, setScreen] = useState<AppShotAssetDto | null>(null);
  const [scene, setScene] = useState('');
  const [background, setBackground] = useState<PickedBackground | null>(null);
  const [busy, setBusy] = useState<AppShotBusy>(null);
  const [error, setError] = useState<string | null>(null);
  const [built, setBuilt] = useState<PhotoOptionDto | null>(null);
  /** App shots made before (newest first), to pick again; null while loading. */
  const [shots, setShots] = useState<PhotoOptionDto[] | null>(null);

  useEffect(() => {
    let live = true;
    adminFetch<{ screen: AppShotAssetDto | null; shots: PhotoOptionDto[] }>(token, base)
      .then((res) => {
        if (!live) return;
        if (res.screen) setScreen((s) => s ?? res.screen);
        setShots(res.shots);
      })
      .catch(() => live && setShots([]));
    return () => {
      live = false;
    };
  }, [token, base]);

  /** Runs one step, showing its error. */
  const step = useCallback(async <T,>(what: NonNullable<AppShotBusy>, fn: () => Promise<T>): Promise<T | null> => {
    setBusy(what);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      return null;
    } finally {
      setBusy(null);
    }
  }, []);

  const uploadScreen = (file: File) =>
    void step('screen', () => uploadAsset(token, `${base}/assets`, file, 'screen')).then((a) => a && setScreen(a));

  const uploadScene = (file: File) =>
    void step('scene-upload', () => uploadAsset(token, `${base}/assets`, file, 'scene')).then(
      (a) => a && setBackground({ bg: { source: 'scene', id: a.id }, thumbUrl: a.url, how: 'upload' }),
    );

  const generateScene = () =>
    void step('scene-generate', () => adminFetch<{ asset: AppShotAssetDto }>(token, `${base}/scene`, { method: 'POST', body: JSON.stringify({ scene }) })).then(
      (res) => res && setBackground({ bg: { source: 'scene', id: res.asset.id }, thumbUrl: res.asset.url, how: 'generated' }),
    );

  const pickStock = (o: PhotoOptionDto) => {
    if (o.ref.source === 'unsplash') setBackground({ bg: { source: 'unsplash', id: o.ref.id }, thumbUrl: o.thumbUrl, how: 'search' });
  };

  /** Removes an earlier App shot (after a confirm, then `onConfirmed`); it leaves the list at once and comes back if the
   *  server refuses. */
  const deleteShot = async (o: PhotoOptionDto, onConfirmed?: () => void) => {
    if (o.ref.source !== 'app_shot' || !window.confirm('Delete this App shot?')) return;
    onConfirmed?.();
    const id = o.ref.id;
    const before = shots;
    setShots((s) => s?.filter((x) => x.key !== o.key) ?? null);
    if (built?.key === o.key) setBuilt(null);
    const ok = await step('delete', () => adminFetch(token, `${base}?shot=${encodeURIComponent(id)}`, { method: 'DELETE' }));
    if (ok === null) setShots(before);
  };

  const build = async (): Promise<PhotoOptionDto | null> => {
    if (!screen) return null;
    const body = { pose, screenId: screen.id, scene: scene.trim(), background: background?.bg ?? null };
    const res = await step('build', () => adminFetch<{ option: PhotoOptionDto }>(token, base, { method: 'POST', body: JSON.stringify(body) }));
    if (res) {
      setBuilt(res.option);
      setShots((s) => [res.option, ...(s ?? [])]);
    }
    return res?.option ?? null;
  };

  return {
    pose, setPose, screen, clearScreen: () => setScreen(null), uploadScreen,
    scene, setScene, background, clearBackground: () => setBackground(null), uploadScene, generateScene, pickStock,
    busy, error, built, build, buildAnother: () => setBuilt(null), shots, deleteShot,
    ready: screen !== null && (background !== null || scene.trim() !== ''),
  };
};

export type AppShotState = ReturnType<typeof useAppShot>;
