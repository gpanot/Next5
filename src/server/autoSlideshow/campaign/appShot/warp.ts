// server-only — never import from a 'use client' file.
// Perspective warp for the App shot: maps a flat screenshot onto the phone screen's four corners.

type Point = [number, number];

/** Solves the 8x8 system for the homography taking the unit square's corners to `quad` (TL, TR, BR, BL). */
const squareToQuad = (quad: Point[]): number[] => {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad as [Point, Point, Point, Point];
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const det = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / det;
  const h = (dx1 * sy - sx * dy1) / det;
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
};

/** The inverse of a 3x3 matrix (row major). */
const invert = (m: number[]): number[] => {
  const [a, b, c, d, e, f, g, h, i] = m as [number, number, number, number, number, number, number, number, number];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [A, -(b * i - c * h), b * f - c * e, B, a * i - c * g, -(a * f - c * d), C, -(a * h - b * g), a * e - b * d].map((v) => v / det);
};

type Raw = { data: Buffer; width: number; height: number };

/** Bilinear RGBA sample of `src` at (u, v) in pixels, clamped to its edges. */
const sample = (src: Raw, u: number, v: number, out: Buffer, at: number) => {
  const x = Math.min(Math.max(u, 0), src.width - 1.001);
  const y = Math.min(Math.max(v, 0), src.height - 1.001);
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const i00 = (y0 * src.width + x0) * 4, i10 = i00 + 4, i01 = i00 + src.width * 4, i11 = i01 + 4;
  for (let k = 0; k < 4; k += 1) {
    const top = src.data[i00 + k]! * (1 - fx) + src.data[i10 + k]! * fx;
    const bottom = src.data[i01 + k]! * (1 - fx) + src.data[i11 + k]! * fx;
    out[at + k] = Math.round(top * (1 - fy) + bottom * fy);
  }
};

/**
 * `src` (RGBA) warped onto `quad` in a transparent RGBA canvas of `width` x `height`. Only the quad's bounding box is
 * walked; pixels outside the quad stay transparent.
 */
export const warpOnto = (src: Raw, quad: Point[], width: number, height: number): Buffer => {
  const out = Buffer.alloc(width * height * 4);
  const inv = invert(squareToQuad(quad));
  const xs = quad.map((p) => p[0]), ys = quad.map((p) => p[1]);
  const left = Math.max(0, Math.floor(Math.min(...xs))), right = Math.min(width - 1, Math.ceil(Math.max(...xs)));
  const top = Math.max(0, Math.floor(Math.min(...ys))), bottom = Math.min(height - 1, Math.ceil(Math.max(...ys)));
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const w = inv[6]! * x + inv[7]! * y + inv[8]!;
      const s = (inv[0]! * x + inv[1]! * y + inv[2]!) / w;
      const t = (inv[3]! * x + inv[4]! * y + inv[5]!) / w;
      if (s < 0 || s > 1 || t < 0 || t > 1) continue;
      sample(src, s * (src.width - 1), t * (src.height - 1), out, (y * width + x) * 4);
    }
  }
  return out;
};
