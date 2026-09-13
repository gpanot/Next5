'use client';

import { Upload, AlertCircle } from 'lucide-react';
import { useFileDrop } from '../../hooks/useFileDrop';

type FileDropProps = {
  accept?: string;
  maxBytes?: number;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
};

export const FileDrop = ({
  accept = 'image/*',
  maxBytes,
  multiple = false,
  onFiles,
  label = 'Upload files',
  hint,
  error: externalError,
  className = '',
}: FileDropProps) => {
  const { dragOver, error: dropError, inputRef, openPicker, getRootProps, getInputProps } =
    useFileDrop({ accept, maxBytes, multiple, onFiles });

  const message = externalError ?? dropError;

  return (
    <div className={['flex flex-col gap-2', className].join(' ')}>
      <div
        {...getRootProps()}
        className={[
          'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors duration-200 cursor-pointer',
          dragOver    ? 'border-app-accent bg-app-accent-soft'
          : message   ? 'border-app-danger bg-app-panel'
                      : 'border-app-line bg-app-sunken hover:border-app-accent/50',
        ].join(' ')}
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={openPicker}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPicker(); }}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-app-panel">
          <Upload className="h-5 w-5 text-app-muted" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[14px] font-medium text-app-ink">{label}</p>
          {hint && <p className="mt-0.5 text-[12px] text-app-muted">{hint}</p>}
        </div>
        <input ref={inputRef} {...getInputProps()} />
      </div>

      {message && (
        <p role="alert" className="flex items-center gap-1.5 text-[12px] text-app-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {message}
        </p>
      )}
    </div>
  );
};
