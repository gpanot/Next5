'use client';

import { useCallback, useEffect, useState } from 'react';

/** A start / reset countdown. It only shows time; it never locks the inputs. */
export const useSprintTimer = (seconds: number) => {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setLeft((s) => {
        if (s <= 1) setRunning(false);
        return Math.max(0, s - 1);
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const start = useCallback(() => {
    setLeft(seconds);
    setRunning(true);
  }, [seconds]);

  const reset = useCallback(() => {
    setRunning(false);
    setLeft(seconds);
  }, [seconds]);

  return { left, running, finished: !running && left === 0, start, reset };
};
