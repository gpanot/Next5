import { describe, expect, it } from 'vitest';
import { chunkBySize } from '../../src/lib/imageCompress';

const MB = 1024 * 1024;

describe('chunkBySize', () => {
  it('keeps every upload request under the 4.5 MB the server accepts', () => {
    const photos = [2 * MB, 2 * MB, 1 * MB, 3 * MB, 0.5 * MB];
    const chunks = chunkBySize(photos, (bytes) => bytes);
    expect(chunks).toEqual([[2 * MB], [2 * MB, 1 * MB], [3 * MB, 0.5 * MB]]); // order is kept
    expect(chunks.every((chunk) => chunk.reduce((sum, b) => sum + b, 0) <= 4.5 * MB)).toBe(true);
    expect(chunks.flat()).toHaveLength(photos.length);
  });

  it('never puts more than 6 photos in one request, and a single big photo goes alone', () => {
    expect(chunkBySize(Array.from({ length: 13 }, () => 0.1 * MB), (b) => b).map((c) => c.length)).toEqual([6, 6, 1]);
    expect(chunkBySize([10 * MB, 0.2 * MB], (b) => b).map((c) => c.length)).toEqual([1, 1]);
  });
});
