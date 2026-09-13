'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';

export type PendingPhoto = { file: File; previewUrl: string };

/** Sends a multipart form to an /api/app route with the session token. */
export const useUpload = () => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async <T,>(path: string, form: FormData): Promise<T | null> => {
    setBusy(true);
    setError(null);
    try {
      return await apiFetch<T>(path, { method: 'POST', body: form });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed. Try again.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  return { upload, busy, error, setError };
};
