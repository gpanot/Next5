// server-only — never import from a 'use client' file.

/** Runs `work` on every item, at most `limit` at a time; each finished item frees a slot for the next. */
export const runPool = async <T>(items: T[], limit: number, work: (item: T) => Promise<void>): Promise<void> => {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await work(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
};
