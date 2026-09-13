'use client';

import { useCallback, useState } from 'react';

export type ToastTone = 'success' | 'error';

export type Toast = {
  id: string;
  message: string;
  tone: ToastTone;
};

export type UseToastReturn = {
  toasts: Toast[];
  toast: (message: string, tone?: ToastTone) => void;
  dismiss: (id: string) => void;
};

let counter = 0;

export const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = String(++counter);
      setToasts((prev) => [...prev, { id, message, tone }]);
      setTimeout(() => dismiss(id), 4_000);
    },
    [dismiss],
  );

  return { toasts, toast, dismiss };
};
