// server-only — Caption burn-in for UGC videos.
// Strategy: Whisper API (Node.js) → word-timing JSON → caption_burn.py (PIL + FFmpeg overlay).
// No libass required. PIL renders bold white text with black stroke; FFmpeg composites it.

import { execFile } from 'child_process';
import { createWriteStream, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { pipeline } from 'stream/promises';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// Path to the caption_burn.py script (relative to project root)
const CAPTION_SCRIPT = resolve(process.cwd(), 'scripts/caption_burn.py');

// ── Whisper word timestamps ────────────────────────────────────────────────────

type WhisperWord = { word: string; start: number; end: number };
type WhisperResponse = { text: string; words?: WhisperWord[] };

/** Transcribe a local WAV file via OpenAI Whisper API. Returns word timestamps. */
async function whisperTranscribe(wavPath: string, scriptHint?: string): Promise<{ words: WhisperWord[]; text: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');

  const { readFileSync } = await import('fs');
  const audioBytes = readFileSync(wavPath);

  const form = new FormData();
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  form.append('language', 'en');
  // The intended script steers Whisper's spelling of names, numbers and prices.
  if (scriptHint?.trim()) form.append('prompt', scriptHint.trim().slice(0, 800));
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
  return { words: data.words ?? [], text: data.text ?? '' };
}

// ── Main export: burnCaptions ─────────────────────────────────────────────────

/**
 * Download video → extract audio → Whisper word timestamps →
 * caption_burn.py (PIL text PNG overlays via FFmpeg) → return buffer.
 *
 * caption_burn.py uses --words (pre-saved Whisper JSON) + auto-chunking;
 * no --phrases needed. Header is set to a space so it renders nothing visible.
 */
export async function burnCaptions(videoUrl: string, scriptHint?: string): Promise<{ buffer: Buffer; transcript: string }> {
  const workDir = join(tmpdir(), `ugc-cap-${Date.now()}`);
  mkdirSync(workDir, { recursive: true });

  const rawPath = join(workDir, 'raw.mp4');
  const wavPath = join(workDir, 'audio.wav');
  const wordsPath = join(workDir, 'words.json');
  const outPath = join(workDir, 'captioned.mp4');

  try {
    // 1. Download video
    const res = await fetch(videoUrl);
    if (!res.ok || !res.body) throw new Error(`Failed to download video: ${res.status}`);
    const writer = createWriteStream(rawPath);
    await pipeline(res.body as unknown as NodeJS.ReadableStream, writer);

    // 2. Extract mono 16kHz WAV for Whisper
    await execFileAsync('ffmpeg', [
      '-v', 'error', '-y',
      '-i', rawPath,
      '-vn', '-ac', '1', '-ar', '16000',
      wavPath,
    ]);

    // 3. Whisper word timestamps
    const { words, text } = await whisperTranscribe(wavPath, scriptHint);

    // 4. Save words JSON for caption_burn.py (it reads --words directly)
    const { writeFileSync, readFileSync } = await import('fs');
    writeFileSync(wordsPath, JSON.stringify({ text, words }), 'utf-8');

    // 5. Spawn caption_burn.py — auto-chunks via PIL, no libass needed.
    //    --header " " renders a blank top line (keeps the layout consistent).
    const { stderr, stdout } = await execFileAsync('python3', [
      CAPTION_SCRIPT,
      '--video', rawPath,
      '--header', ' ',          // blank header — no top text overlay
      '--words', wordsPath,     // skip Whisper re-call inside the script
      '--out', outPath,
    ], {
      timeout: 5 * 60_000,      // 5-minute hard cap
      env: { ...process.env },  // pass OPENAI_API_KEY in case script needs it
    });

    if (stderr) {
      console.log('[ugcCaption] caption_burn stderr:', stderr);
    }
    if (stdout) {
      console.log('[ugcCaption] caption_burn stdout:', stdout);
    }

    const buffer = readFileSync(outPath);
    return { buffer, transcript: text };
  } finally {
    try { rmSync(workDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}
