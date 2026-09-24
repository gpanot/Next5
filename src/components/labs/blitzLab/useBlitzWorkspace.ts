'use client';

/**
 * The part of a Blitz editor that is not about the composition being edited: the asset library,
 * the render library, uploads in flight, and the render job itself.
 *
 * Blitz Lab and Blitz Slideshow are two different editors over the same machinery. This hook is
 * the machinery, so the difference between them stays the difference in what they compose.
 */

import { useCallback, useEffect, useState } from 'react';
import { blitzApi, type BlitzAssetDto, type BlitzProjectDto } from './api';
import { useLabClient } from '../LabClientProvider';
import { useBlitzUploads } from './useBlitzUploads';
import { useBlitzRender } from './useBlitzRender';
import type { BlitzUploadType } from './upload';

type Options = {
  /** A temporary `local:` key was replaced by the saved R2 key — repoint anything using it. */
  onKeyReplaced: (localKey: string, r2Key: string) => void;
  /** An asset was deleted — drop it from the editor's own selection. */
  onAssetDeleted?: (asset: BlitzAssetDto) => void;
  /** Keep only the renders this editor is about. Default: all of them. */
  filterLibrary?: (project: BlitzProjectDto) => boolean;
};

export function useBlitzWorkspace({ onKeyReplaced, onAssetDeleted, filterLibrary }: Options) {
  const client = useLabClient();
  const [assets, setAssets] = useState<BlitzAssetDto[]>([]);
  const [library, setLibrary] = useState<BlitzProjectDto[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);

  const { uploads, startUpload, retry } = useBlitzUploads({ setAssets, onKeyReplaced });

  /** Add at the top when new, update in place when known. */
  const upsertLibraryProject = useCallback((project: BlitzProjectDto) => {
    setLibrary((prev) =>
      prev.some((p) => p.id === project.id)
        ? prev.map((p) => (p.id === project.id ? project : p))
        : [project, ...prev],
    );
  }, []);

  // Queued, updated and completed all upsert: the card appears immediately and fills in.
  const render = useBlitzRender(upsertLibraryProject, upsertLibraryProject, upsertLibraryProject);

  // The flag starts true, so the first load never raises it. Nothing is set until the request
  // settles, and a cancelled mount stops writing at all.
  useEffect(() => {
    let cancelled = false;
    blitzApi
      .listCompleted(client)
      .then((res) => {
        if (cancelled || !res.ok) return;
        const projects = res.data.projects ?? [];
        setLibrary(filterLibrary ? projects.filter(filterLibrary) : projects);
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setLibraryLoading(false); });
    return () => { cancelled = true; };
  }, [client, filterLibrary]);

  /** Reload on demand, showing the loading state again. */
  const refreshLibrary = useCallback(async () => {
    setLibraryLoading(true);
    const res = await blitzApi.listCompleted(client).catch(() => null);
    if (res?.ok) {
      const projects = res.data.projects ?? [];
      setLibrary(filterLibrary ? projects.filter(filterLibrary) : projects);
    }
    setLibraryLoading(false);
  }, [client, filterLibrary]);

  const renameAsset = useCallback(async (id: string, name: string) => {
    const res = await blitzApi.renameAsset(client, id, name).catch(() => null);
    if (!res?.ok || !res.data.asset) return res?.data.error ?? 'Rename failed';
    const saved = res.data.asset;
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, name: saved.name } : a)));
    return null;
  }, [client]);

  const deleteAsset = useCallback(async (id: string) => {
    const target = assets.find((a) => a.id === id);
    const res = await blitzApi.deleteAsset(client, id).catch(() => null);
    if (!res?.ok) return res?.data.error ?? 'Delete failed';
    setAssets((prev) => prev.filter((a) => a.id !== id));
    if (target) onAssetDeleted?.(target);
    return null;
  }, [client, assets, onAssetDeleted]);

  const addAsset = useCallback((asset: BlitzAssetDto) => setAssets((prev) => [...prev, asset]), []);

  const removeLibraryProject = useCallback(
    (id: string) => setLibrary((prev) => prev.filter((p) => p.id !== id)),
    [],
  );

  /** Start an upload and hand back the temporary key to show while it runs. */
  const pickFile = useCallback(
    (type: BlitzUploadType, file: File): string => startUpload(type, file),
    [startUpload],
  );

  return {
    client,
    assets,
    setAssets,
    addAsset,
    uploads,
    pickFile,
    retryUpload: retry,
    library,
    libraryLoading,
    refreshLibrary,
    removeLibraryProject,
    renameAsset,
    deleteAsset,
    render,
  };
}
