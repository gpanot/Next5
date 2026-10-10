// server-only — never import from a 'use client' file.
//
// Hedged model calls: the same request sent again when the first is slow, the first usable answer wins. Vision calls
// usually answer in 2-5 s but some take 12-22 s at random (provider queues); a batch that runs 50 at once waits for its
// slowest, so a second try after `afterMs` cuts that tail for the price of a few extra small calls.

/** Runs `call`; when it has no usable (non-null) answer after `afterMs`, runs it once more. Null when both give none. */
export function hedged<T>(call: () => Promise<T | null>, afterMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    let settled = false;
    let running = 1;
    const done = (value: T | null) => {
      running -= 1;
      if (settled) return;
      if (value !== null) {
        settled = true;
        clearTimeout(timer);
        resolve(value);
      } else if (running === 0) {
        settled = true;
        resolve(null);
      }
    };
    const start = () => call().catch(() => null).then(done);
    const timer = setTimeout(() => {
      if (settled) return;
      running += 1;
      void start();
    }, afterMs);
    void start();
  });
}
