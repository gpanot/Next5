// server-only — FFmpeg + Whisper caption burn-in for UGC videos.

import { execFile } from 'child_process';
import { createWriteStream, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// ── Whisper word timestamps ────────────────────────────────────────────────────

type WhisperWord = { word: string; start: number; end: number };
type WhisperResponse = { text: string; words?: WhisperWord[] };

/** Transcribe a local audio file via OpenAI Whisper API. Returns word timestamps. */
async function whisperTranscribe(wavPath: string): Promise<WhisperWord[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');

  const { readFileSync } = await import('fs');
  const audioBytes = readFileSync(wavPath);

  const form = new FormData();
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  form.append('language', 'en');
  form.append(
    'file',
    new Blob([audioBytes], { type: 'audio/wav' }),
    'audio.wav',
  );

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Whisper API error: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as WhisperResponse;
  return data.words ?? [];
}

// ── ASS subtitle builder ───────────────────────────────────────────────────────

type CaptionChunk = { text: string; start: number; end: number };

/** Auto-chunk words into 1-3 word captions, breaking on punctuation or gaps. */
function autoChunk(words: WhisperWord[]): CaptionChunk[] {
  const chunks: CaptionChunk[] = [];
  let current: WhisperWord[] = [];

  for (let i = 0; i < words.length; i++) {
    current.push(words[i]);
    const gap =
      i + 1 < words.length ? words[i + 1].start - words[i].end : 9;
    const isPunct = /[.,!?]$/.test(words[i].word);
    const isLongEnough = current.length >= 3;

    if (isLongEnough || isPunct || gap > 0.4) {
      const startSec = current[0].start;
      const endSec =
        i + 1 < words.length
          ? words[i + 1].start - 0.002 // trim 2ms to avoid overlap
          : current[current.length - 1].end + 0.3;

      chunks.push({
        text: current.map((w) => w.word).join(' ').replace(/[,.]$/, ''),
        start: startSec,
        end: Math.max(endSec, startSec + 0.15),
      });
      current = [];
    }
  }

  if (current.length > 0) {
    chunks.push({
      text: current.map((w) => w.word).join(' '),
      start: current[0].start,
      end: current[current.length - 1].end + 0.3,
    });
  }

  return chunks;
}

/** Convert seconds to ASS time format: h:mm:ss.cs */
function toAssTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  const cs = Math.floor((secs % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/** Build an ASS subtitle string with TikTok-style bold white text + black outline. */
function buildAss(chunks: CaptionChunk[]): string {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: UGC,Helvetica,58,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,4,0,2,30,30,980,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const events = chunks
    .map(
      ({ text, start, end }) =>
        `Dialogue: 0,${toAssTime(start)},${toAssTime(end)},UGC,,0,0,0,,{\\b1}${text.toUpperCase()}`,
    )
    .join('\n');

  return header + events + '\n';
}

// ── Main export: burnCaptions ─────────────────────────────────────────────────

/** Download video, transcribe, burn TikTok-style captions, return captioned buffer. */
export async function burnCaptions(videoUrl: string): Promise<{ buffer: Buffer; transcript: string }> {
  const workDir = join(tmpdir(), `ugc-cap-${Date.now()}`);
  mkdirSync(workDir, { recursive: true });

  const rawPath = join(workDir, 'raw.mp4');
  const wavPath = join(workDir, 'audio.wav');
  const assPath = join(workDir, 'subs.ass');
  const outPath = join(workDir, 'captioned.mp4');

  try {
    // 1. Download video
    const res = await fetch(videoUrl);
    if (!res.ok || !res.body) throw new Error(`Failed to download video: ${res.status}`);
    const writer = createWriteStream(rawPath);
    await pipeline(res.body as unknown as NodeJS.ReadableStream, writer);

    // 2. Extract mono audio for Whisper
    await execFileAsync('ffmpeg', [
      '-v', 'error', '-y',
      '-i', rawPath,
      '-vn', '-ac', '1', '-ar', '16000',
      wavPath,
    ]);

    // 3. Whisper word timestamps
    const words = await whisperTranscribe(wavPath);
    const transcript = words.map((w) => w.word).join(' ');

    // 4. Build ASS subtitles
    const chunks = autoChunk(words);
    const ass = buildAss(chunks);
    const { writeFileSync, readFileSync } = await import('fs');
    writeFileSync(assPath, ass, 'utf-8');

    // 5. Burn captions with FFmpeg
    await execFileAsync('ffmpeg', [
      '-v', 'error', '-y',
      '-i', rawPath,
      '-vf', `ass=${assPath}`,
      '-c:v', 'libx264', '-crf', '18', '-preset', 'medium',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'copy',
      '-movflags', '+faststart',
      outPath,
    ]);

    const buffer = readFileSync(outPath);
    return { buffer, transcript };
  } finally {
    try { rmSync(workDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}
