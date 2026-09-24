import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execFileAsync = promisify(execFile);
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
});

async function dl(key: string, dest: string) {
  const res = await s3.send(new GetObjectCommand({ Bucket: 'next5-photos', Key: key }));
  const chunks: Uint8Array[] = [];
  for await (const c of res.Body as AsyncIterable<Uint8Array>) chunks.push(c);
  fs.writeFileSync(dest, Buffer.concat(chunks));
}

async function main() {
  // probe scraped Video 1 and cinderella
  await dl('blitz/videos/25a45e47ed46457188cd904d7d538b3d.mp4', '/tmp/vid1.mp4');
  await dl('blitz/audio/cinderella.mp3', '/tmp/cinderella.mp3');

  for (const [label, path] of [['VIDEO1', '/tmp/vid1.mp4'], ['MUSIC', '/tmp/cinderella.mp3']]) {
    const { stdout } = await execFileAsync('ffprobe', ['-v','error','-print_format','json','-show_format','-show_streams', path]);
    const info = JSON.parse(stdout) as { format?: { duration?: string; size?: string }; streams?: Array<{ codec_type?: string; codec_name?: string }> };
    const size = parseInt(info.format?.size ?? '0', 10);
    const dur = parseFloat(info.format?.duration ?? '0');
    const streams = info.streams?.map(s => `${s.codec_type}/${s.codec_name}`).join(', ');
    console.log(`${label}: ${(size/1024/1024).toFixed(2)} MB  ${dur.toFixed(2)}s  [${streams}]`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
