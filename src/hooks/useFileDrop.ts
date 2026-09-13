'use client';

import { useCallback, useRef, useState } from 'react';

export type UseFileDropOptions = {
  accept?: string;         // e.g. 'image/*'
  maxBytes?: number;       // default 10 MB
  multiple?: boolean;
  onFiles: (files: File[]) => void;
};

export type UseFileDropReturn = {
  dragOver: boolean;
  error: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  openPicker: () => void;
  getRootProps: () => {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
  };
  getInputProps: () => React.InputHTMLAttributes<HTMLInputElement>;
};

const DEFAULT_MAX = 10 * 1024 * 1024; // 10 MB

export const useFileDrop = ({
  accept = 'image/*',
  maxBytes = DEFAULT_MAX,
  multiple = false,
  onFiles,
}: UseFileDropOptions): UseFileDropReturn => {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError]       = useState('');
  const inputRef                = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files);
      const invalid = list.find((f) => accept !== 'image/*' && !f.type.startsWith(accept.replace('*', '')));
      if (invalid) { setError('Invalid file type.'); return; }
      const tooBig = list.find((f) => f.size > maxBytes);
      if (tooBig) { setError(`File too large — max ${Math.round(maxBytes / 1024 / 1024)} MB.`); return; }
      setError('');
      onFiles(list);
    },
    [accept, maxBytes, onFiles],
  );

  const openPicker = useCallback(() => inputRef.current?.click(), []);

  const getRootProps = useCallback(() => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); },
    onDragLeave: () => setDragOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      processFiles(e.dataTransfer.files);
    },
  }), [processFiles]);

  const getInputProps = useCallback(() => ({
    type: 'file' as const,
    accept,
    multiple,
    className: 'sr-only',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) processFiles(e.target.files);
      e.target.value = '';
    },
  }), [accept, multiple, processFiles]);

  return { dragOver, error, inputRef, openPicker, getRootProps, getInputProps };
};
