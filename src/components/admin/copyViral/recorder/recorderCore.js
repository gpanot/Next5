// Recorder core shared by the Next5 copy viral recorder (React hooks wrap it) and the studio skill (plain JS).
// Camera + mic, input level, MediaRecorder with countdown and review, voice follow. No framework, no imports.
// The copy in Next5 (src/components/admin/copyViral/recorder/recorderCore.js) is the source: edit it there, then run
// `npm run recorder:sync` to copy it to the studio skill. A test fails while the two copies differ.

/** localStorage that never throws (private window, blocked storage). */
export const store = {
  get: (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; } },
  set: (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* not remembered */ } },
};

/** MP4 (H.264 + AAC) when the browser records it (Chrome 130+, Safari), else WebM (the server converts both). */
const MIME_TYPES = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
export const pickMimeType = () => MIME_TYPES.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) ?? '';
const newMediaRecorder = (stream) => {
  const mimeType = pickMimeType();
  return new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 16_000_000, audioBitsPerSecond: 256_000 });
};

// ---- camera + microphone

/**
 * Camera + mic stream. The picked devices are remembered under `<keyPrefix>.camera` / `.mic`. `onChange` fires when
 * the stream, the device list or the error changes. An `open` that a later `open` or `close` overtook is dropped.
 */
export class Devices {
  constructor(onChange, keyPrefix = 'recorder') {
    this.onChange = onChange; this.keyPrefix = keyPrefix; this.gen = 0;
    this.stream = null; this.info = null; this.error = null; this.cameras = []; this.mics = [];
    this.cameraId = store.get(`${keyPrefix}.camera`, ''); this.micId = store.get(`${keyPrefix}.mic`, '');
  }

  async open(wide) {
    this.close();
    const gen = this.gen;
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        // the best the camera gives (the edit crops the middle to 9:16); wide framing asks for a 16:9 picture
        video: { ...(this.cameraId ? { deviceId: { exact: this.cameraId } } : {}), width: { ideal: 3840 }, height: { ideal: 2160 }, frameRate: { ideal: 30 }, ...(wide ? { aspectRatio: { ideal: 16 / 9 } } : {}) },
        audio: { ...(this.micId ? { deviceId: { exact: this.micId } } : {}), echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      if (gen !== this.gen) { s.getTracks().forEach((t) => t.stop()); return; }
      this.stream = s;
      const st = s.getVideoTracks()[0]?.getSettings();
      this.info = st ? { width: st.width ?? 0, height: st.height ?? 0, fps: Math.round(st.frameRate ?? 0) } : null;
      this.error = null;
      const all = await navigator.mediaDevices.enumerateDevices();
      const opt = (kind) => all.filter((d) => d.kind === kind && d.deviceId).map((d, i) => ({ id: d.deviceId, label: d.label || `${kind === 'videoinput' ? 'Camera' : 'Microphone'} ${i + 1}` }));
      this.cameras = opt('videoinput');
      this.mics = opt('audioinput');
    } catch (err) {
      if (gen !== this.gen) return;
      if ((this.cameraId || this.micId) && ['OverconstrainedError', 'NotFoundError'].includes(err?.name)) {   // unplugged: defaults
        this.cameraId = ''; this.micId = '';
        return this.open(wide);
      }
      this.error = err instanceof Error ? `${err.name}: ${err.message}` : 'Camera or microphone blocked';
    }
    if (gen === this.gen) this.onChange();
  }

  setCamera(id, wide) { this.cameraId = id; store.set(`${this.keyPrefix}.camera`, id); return this.open(wide); }
  setMic(id, wide) { this.micId = id; store.set(`${this.keyPrefix}.mic`, id); return this.open(wide); }
  close() { this.gen += 1; this.stream?.getTracks().forEach((t) => t.stop()); this.stream = null; }
}

// ---- input level

/** Microphone level 0..1 (RMS, eased), about 15 times a second. */
export class Level {
  constructor(onLevel) { this.onLevel = onLevel; this.ctx = null; this.timer = null; }
  attach(stream) {
    this.detach();
    if (!stream || !stream.getAudioTracks().length) return;
    this.ctx = new AudioContext();
    const an = this.ctx.createAnalyser();
    an.fftSize = 1024;
    this.ctx.createMediaStreamSource(stream).connect(an);
    const data = new Float32Array(an.fftSize);
    let eased = 0;
    this.timer = setInterval(() => {
      an.getFloatTimeDomainData(data);
      const rms = Math.sqrt(data.reduce((a, v) => a + v * v, 0) / data.length);
      // speech at a normal distance sits around 0.05-0.2 RMS: scale so that reads as "good"
      eased = Math.max(Math.min(1, rms * 5), eased * 0.8);
      this.onLevel(eased);
    }, 66);
  }
  detach() { clearInterval(this.timer); this.timer = null; void this.ctx?.close(); this.ctx = null; }
}
export const levelLabel = (l) => (l < 0.12 ? 'Too quiet' : l > 0.92 ? 'Too loud' : 'Good level');

// ---- recorder

const COUNTDOWN_S = 3;

/** idle → countdown 3 s → recording → review (a playable file) → keep or retake. `onChange('tick')` for the timer. */
export class Recorder {
  constructor(onChange) { this.onChange = onChange; this.state = 'idle'; this.count = COUNTDOWN_S; this.elapsedMs = 0; this.take = null; this.rec = null; this.timer = null; }
  get busy() { return this.state === 'countdown' || this.state === 'recording'; }

  start(stream) {
    if (!stream || this.busy) return;
    this.state = 'countdown'; this.count = COUNTDOWN_S; this.onChange();
    this.timer = setInterval(() => {
      this.count -= 1; this.onChange();
      if (this.count <= 0) { clearInterval(this.timer); this.begin(stream); }
    }, 1000);
  }
  begin(stream) {
    const rec = newMediaRecorder(stream);
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const type = rec.mimeType.split(';')[0] || 'video/webm';
      const file = new File(chunks, `take-${Date.now()}.${type.includes('mp4') ? 'mp4' : 'webm'}`, { type });
      this.take = { file, url: URL.createObjectURL(file) };
      this.state = 'review'; this.onChange();
    };
    rec.start(1000);
    this.rec = rec;
    const t0 = Date.now();
    this.elapsedMs = 0;
    this.timer = setInterval(() => { this.elapsedMs = Date.now() - t0; this.onChange('tick'); }, 100);
    this.state = 'recording'; this.onChange();
  }
  stop() {
    clearInterval(this.timer);
    if (this.rec?.state === 'recording') this.rec.stop();
    else { this.state = 'idle'; this.onChange(); }
  }
  /** Drops the take under review (retake). */
  discard() {
    if (this.take) URL.revokeObjectURL(this.take.url);
    this.take = null; this.state = 'idle'; this.onChange();
  }
  /** A throwaway half-second recording when the camera opens: Chrome sets up the video encoder on the first
   *  MediaRecorder of a stream, and without this the first real take froze while it did. */
  warm(stream) {
    if (!stream || this.busy) return;
    try {
      const r = newMediaRecorder(stream);
      r.start();
      setTimeout(() => { if (r.state === 'recording') r.stop(); }, 500);
    } catch { /* the real take reports any error */ }
  }
  /** Closing the recorder: timers stop, a running take is dropped. */
  dispose() {
    clearInterval(this.timer);
    if (this.rec?.state === 'recording') { this.rec.onstop = null; this.rec.stop(); }
  }
}

// ---- voice follow (Chrome speech recognition): how many script words have been read

export const normWord = (w) => w.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
/** How far a heard word may jump ahead in the script (skipped or misheard words). */
const LOOKAHEAD = 4;
/**
 * Number of script words read so far: walks the heard words in order and moves a cursor forward each time one
 * matches a script word at most LOOKAHEAD words ahead. Heard words that match nothing (fillers) are skipped.
 */
export const followPointer = (script, heard) => {
  const target = script.map(normWord);
  let read = 0;
  for (const raw of heard) {
    const w = normWord(raw);
    if (!w) continue;
    for (let k = read; k < Math.min(target.length, read + LOOKAHEAD + 1); k++) if (target[k] === w) { read = k + 1; break; }
  }
  return read;
};

const speech = () => (typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition || null);
export const followSupported = () => speech() !== null;

/**
 * Listens from the countdown to the stop: Chrome opens its own mic capture when recognition starts, so that happens
 * before MediaRecorder begins, not in the first second of the take. Restarts itself when Chrome ends a session.
 */
export class VoiceFollow {
  constructor(onRead) { this.onRead = onRead; this.halt = null; }
  start(script, lang = 'en-US') {
    this.stop();
    const Speech = speech();
    if (!Speech) return;
    let read = 0, before = [], stopped = false;
    const rec = new Speech();
    rec.continuous = true; rec.interimResults = true; rec.lang = lang;
    rec.onresult = (e) => {
      const now = Array.from(e.results).flatMap((r) => r[0].transcript.split(/\s+/));
      read = followPointer(script, [...before, ...now]);
      this.onRead(read);
    };
    rec.onend = () => {   // a new session starts with empty results: keep what was heard so far
      if (stopped) return;
      before = script.slice(0, read);
      try { rec.start(); } catch { /* already restarting */ }
    };
    rec.start();
    this.halt = () => { stopped = true; rec.stop(); };
    this.onRead(0);
  }
  stop() { this.halt?.(); this.halt = null; }
  /** Starts and aborts one recognition session so Chrome's speech engine is loaded before the first take. */
  prime(lang = 'en-US') {
    const Speech = speech();
    if (!Speech || this.halt) return;
    const r = new Speech();
    r.lang = lang;
    r.onaudiostart = () => r.abort();
    r.onerror = () => {};
    try { r.start(); setTimeout(() => r.abort(), 1500); } catch { /* another session is running */ }
  }
}
