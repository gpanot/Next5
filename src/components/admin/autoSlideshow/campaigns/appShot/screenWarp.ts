// The App shot preview's perspective warp, done by the browser: a CSS matrix3d that puts a flat box on the pose's
// screen corners, as the server's warp does when it builds the image.

type Point = [number, number];

/** The screen's size, averaged over its opposite edges (as the server sizes the screenshot before warping it). */
export const screenSize = (quad: Point[]): { width: number; height: number } => {
  const [tl, tr, br, bl] = quad as [Point, Point, Point, Point];
  const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  return { width: (dist(tl, tr) + dist(bl, br)) / 2, height: (dist(tl, bl) + dist(tr, br)) / 2 };
};

/**
 * The CSS transform taking a `width` x `height` box (transform-origin at its top left) onto `quad` (TL, TR, BR, BL),
 * every point scaled by `scale` (photo pixels to on-screen pixels).
 */
export const quadTransform = (quad: Point[], width: number, height: number, scale: number): string => {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad.map(([x, y]) => [x * scale, y * scale]) as [Point, Point, Point, Point];
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const det = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / det;
  const h = (dx1 * sy - sx * dy1) / det;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3;
  // The unit square's homography, stretched to the box's size, in matrix3d's column-major order.
  const m = [a / width, d / width, 0, g / width, b / height, e / height, 0, h / height, 0, 0, 1, 0, x0, y0, 0, 1];
  return `matrix3d(${m.join(',')})`;
};
