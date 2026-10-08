/**
 * Depth maps for Slideshow photos (camera moves with 2.5D parallax, see src/remotion/CameraStill.tsx).
 *
 * Depth Anything V2 Small (ONNX, CPU, ~1 s per photo) → a 1080×1920 depth map → two displacement maps:
 *   radial.png  R,G = 0.5 + 0.5·depth·(x,y from centre)   — dolly (push_in / pull_out)
 *   truck.png   R = depth, G = 0.5                          — sideways parallax (drifts)
 * plus meta.json { spread } (5th–95th percentile depth spread). Cached in R2 per photo key, so each photo is
 * processed once. ffmpeg (already in the image) does the decode, crop, resize, blur and PNG encode.
 */

import { execFile } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import * as ort from 'onnxruntime-node';
import { downloadFromR2, objectExists, uploadToR2 } from './r2';

const execFileAsync = promisify(execFile);
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const MODEL_URL = process.env.DEPTH_MODEL_URL
  || 'https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model.onnx';
const MODEL_PATH = path.join(os.tmpdir(), 'depth-anything-v2-small.onnx');

/** Model input: 518 wide (its training size), 9:16-ish, both sides multiples of 14. */
const IN_W = 518;
const IN_H = 924;
const OUT_W = 1080;
const OUT_H = 1920;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

export type DepthMaps = { radialKey: string; truckKey: string; spread: number };

let sessionPromise: Promise<ort.InferenceSession> | null = null;

/** Downloads the model once per container (~100 MB) and keeps one session. */
function getSession(): Promise<ort.InferenceSession> {
  sessionPromise ??= (async () => {
    if (!fs.existsSync(MODEL_PATH)) {
      console.log(`[depth] Downloading model from ${MODEL_URL}`);
      const res = await fetch(MODEL_URL);
      if (!res.ok) throw new Error(`Depth model download failed: ${res.status}`);
      const part = `${MODEL_PATH}.part`;
      fs.writeFileSync(part, Buffer.from(await res.arrayBuffer()));
      fs.renameSync(part, MODEL_PATH);
    }
    return ort.InferenceSession.create(MODEL_PATH);
  })().catch((err: unknown) => {
    sessionPromise = null;
    throw err;
  });
  return sessionPromise;
}

const ffmpeg = async (args: string[]): Promise<Buffer> => {
  const { stdout } = await execFileAsync(FFMPEG, ['-v', 'error', ...args], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
  return stdout;
};

/** Photo → normalised depth (0 = far, 255 = near) at 1080×1920, cover-cropped like the composition shows it. */
async function predictDepth(photoPath: string, tmpDir: string): Promise<Uint8Array> {
  const rgb = await ffmpeg(['-i', photoPath, '-vf', `scale=${IN_W}:${IN_H}:force_original_aspect_ratio=increase,crop=${IN_W}:${IN_H}`,
    '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
  const plane = IN_W * IN_H;
  const input = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) input[c * plane + i] = (rgb[i * 3 + c]! / 255 - MEAN[c]!) / STD[c]!;
  }
  const session = await getSession();
  const result = await session.run({ [session.inputNames[0]!]: new ort.Tensor('float32', input, [1, 3, IN_H, IN_W]) });
  const output = result[session.outputNames[0]!]!;
  const [h, w] = output.dims.slice(-2) as [number, number];
  const data = output.data as Float32Array;
  let min = Infinity;
  let max = -Infinity;
  for (const v of data) { if (v < min) min = v; if (v > max) max = v; }
  const gray = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) gray[i] = Math.round(((data[i]! - min) / (max - min + 1e-6)) * 255);
  const rawPath = path.join(tmpDir, 'depth.gray');
  fs.writeFileSync(rawPath, gray);
  // Upscale and soften: a blurred map bends edges smoothly instead of tearing them.
  return ffmpeg(['-f', 'rawvideo', '-pix_fmt', 'gray', '-s', `${w}x${h}`, '-i', rawPath,
    '-vf', `scale=${OUT_W}:${OUT_H}:flags=bicubic,gblur=sigma=6`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-']);
}

/** The two displacement maps as raw RGB, and the depth spread. */
function buildMaps(depth: Uint8Array): { radial: Buffer; truck: Buffer; spread: number } {
  const radial = Buffer.alloc(OUT_W * OUT_H * 3);
  const truck = Buffer.alloc(OUT_W * OUT_H * 3);
  const histogram = new Array<number>(256).fill(0);
  for (let y = 0; y < OUT_H; y++) {
    const ny = (y / (OUT_H - 1)) * 2 - 1;
    for (let x = 0; x < OUT_W; x++) {
      const i = y * OUT_W + x;
      const d = depth[i]!;
      const v = d / 255;
      histogram[d]!++;
      radial[i * 3] = Math.round(255 * (0.5 + 0.5 * v * ((x / (OUT_W - 1)) * 2 - 1)));
      radial[i * 3 + 1] = Math.round(255 * (0.5 + 0.5 * v * ny));
      radial[i * 3 + 2] = 128;
      truck[i * 3] = d;
      truck[i * 3 + 1] = 128;
      truck[i * 3 + 2] = 128;
    }
  }
  const percentile = (q: number) => {
    let seen = 0;
    for (let d = 0; d < 256; d++) { seen += histogram[d]!; if (seen >= q * depth.length) return d / 255; }
    return 1;
  };
  return { radial, truck, spread: Number((percentile(0.95) - percentile(0.05)).toFixed(3)) };
}

async function encodePng(rgb: Buffer, rawPath: string, pngPath: string): Promise<void> {
  fs.writeFileSync(rawPath, rgb);
  await ffmpeg(['-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${OUT_W}x${OUT_H}`, '-i', rawPath, '-frames:v', '1', pngPath]);
}

/**
 * The displacement maps for one photo, made and uploaded on first use, read from R2 after that.
 * meta.json is written last, so its presence means the set is complete.
 */
export async function ensureDepthMaps(photoKey: string, tmpDir: string): Promise<DepthMaps> {
  const base = `blitz/depth/${crypto.createHash('sha1').update(photoKey).digest('hex')}`;
  const keys = { radialKey: `${base}/radial.png`, truckKey: `${base}/truck.png`, metaKey: `${base}/meta.json` };
  const dir = fs.mkdtempSync(path.join(tmpDir, 'depth-'));
  const metaPath = path.join(dir, 'meta.json');
  if (await objectExists(keys.metaKey)) {
    await downloadFromR2(keys.metaKey, metaPath);
    const { spread } = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as { spread: number };
    return { radialKey: keys.radialKey, truckKey: keys.truckKey, spread };
  }
  const photoPath = path.join(dir, `photo${path.extname(photoKey) || '.jpg'}`);
  await downloadFromR2(photoKey, photoPath);
  const { radial, truck, spread } = buildMaps(await predictDepth(photoPath, dir));
  const radialPath = path.join(dir, 'radial.png');
  const truckPath = path.join(dir, 'truck.png');
  await encodePng(radial, path.join(dir, 'radial.rgb'), radialPath);
  await encodePng(truck, path.join(dir, 'truck.rgb'), truckPath);
  await uploadToR2(radialPath, keys.radialKey, 'image/png');
  await uploadToR2(truckPath, keys.truckKey, 'image/png');
  fs.writeFileSync(metaPath, JSON.stringify({ spread }));
  await uploadToR2(metaPath, keys.metaKey, 'application/json');
  return { radialKey: keys.radialKey, truckKey: keys.truckKey, spread };
}
