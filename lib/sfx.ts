/**
 * Звуки действий без файлов: синтез в Web Audio (печатная машинка, штамп,
 * шорох бумаги, звонок телефона). Включаются/выключаются кнопкой в боковом
 * меню, выбор запоминается в браузере.
 */
type Ctx = AudioContext;
let ctx: Ctx | null = null;
const KEY = "sfx-muted";

export function isMuted(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(m: boolean) {
  try {
    window.localStorage.setItem(KEY, m ? "1" : "0");
  } catch {
    /* хранилище недоступно — просто не запоминаем */
  }
  if (m) stopRing();
}

// Пока звучит голос реплики, машинка молчит.
const playingVoices = new Set<HTMLAudioElement>();
export function setVoicePlaying(a: HTMLAudioElement, on: boolean) {
  if (on) playingVoices.add(a);
  else playingVoices.delete(a);
}
const voiceOn = () => playingVoices.size > 0;

function ac(): Ctx | null {
  if (typeof window === "undefined" || isMuted()) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function noise(c: Ctx, seconds: number): AudioBuffer {
  const b = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * seconds)), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function burst(c: Ctx, { dur, freq, q, gain, type = "bandpass" as BiquadFilterType, when = 0 }: { dur: number; freq: number; q: number; gain: number; type?: BiquadFilterType; when?: number }) {
  const t = c.currentTime + when;
  const src = c.createBufferSource();
  src.buffer = noise(c, dur);
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function tone(c: Ctx, { freq, dur, gain, type = "sine" as OscillatorType, when = 0, slideTo }: { freq: number; dur: number; gain: number; type?: OscillatorType; when?: number; slideTo?: number }) {
  const t = c.currentTime + when;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// Удары клавиш — запись настоящей машинки: 14 ударов в одном файле,
// каждый в своём окне по 0,15 с (public/sfx/typewriter-keys.wav).
const KEYS_URL = "/sfx/typewriter-keys.wav";
const KEY_SLOT = 0.15;
const KEY_LEN = 0.11;
const KEY_COUNT = 14;
const KEY_VOLUME = 0.35;
let keysBuf: AudioBuffer | null = null;
let keysLoading = false;
function loadKeys(c: Ctx) {
  if (keysBuf || keysLoading) return;
  keysLoading = true;
  fetch(KEYS_URL)
    .then((r) => r.arrayBuffer())
    .then((b) => c.decodeAudioData(b))
    .then((buf) => {
      keysBuf = buf;
    })
    .catch(() => {
      keysLoading = false; // попробуем в следующий раз
    });
}
let lastKey = -1;
function playKey(gain: number) {
  if (voiceOn()) return;
  const c = ac();
  if (!c) return;
  if (!keysBuf) return loadKeys(c); // первые удары до загрузки — тихо
  let i = Math.floor(Math.random() * KEY_COUNT);
  if (i === lastKey) i = (i + 1) % KEY_COUNT; // один и тот же удар подряд звучит механически
  lastKey = i;
  const src = c.createBufferSource();
  src.buffer = keysBuf;
  src.playbackRate.value = 0.96 + Math.random() * 0.08;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(g).connect(c.destination);
  src.start(0, i * KEY_SLOT, KEY_LEN);
}

/** Удар клавиши печатной машинки (запись) */
export function key() {
  playKey(KEY_VOLUME);
}

/** Конец абзаца — удар чуть громче, без звонка */
export function carriage() {
  playKey(KEY_VOLUME * 1.3);
}

/** Заранее загрузить звук клавиш (вызывается при первом показе печатающегося текста). */
export function preloadKeys() {
  const c = ac();
  if (c) loadKeys(c);
}

/** Штамп: глухой удар и шлепок резины */
export function stamp() {
  const c = ac();
  if (!c) return;
  tone(c, { freq: 140, dur: 0.18, gain: 0.35, slideTo: 60 });
  burst(c, { dur: 0.09, freq: 700, q: 0.7, gain: 0.25, type: "lowpass" });
}

/** Шорох бумаги: тихий, едва слышный (вариант D) — мягкое шуршание без резких верхов */
export function paper() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noise(c, 0.25);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 1600;
  f.Q.value = 0.6;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.05, t + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
  src.stop(t + 0.27);
}

/** Тихий щелчок интерфейса */
export function tick() {
  const c = ac();
  if (!c) return;
  burst(c, { dur: 0.02, freq: 1800, q: 2, gain: 0.06 });
}

let ring: HTMLAudioElement | null = null;
let ringFade: ReturnType<typeof setInterval> | null = null;
let fading: HTMLAudioElement | null = null;
/**
 * Звонок старого телефона — запись (public/sfx/phone-ring.mp3: одна трель ~2 с и пауза,
 * всего 5,4 с), крутится по кругу до stopRing().
 */
export function startRing() {
  stopRing();
  if (typeof window === "undefined" || isMuted()) return;
  try {
    ring = new Audio("/sfx/phone-ring.mp3");
    ring.loop = true;
    ring.volume = 0.55;
    void ring.play().catch(() => {
      /* браузер не дал играть без клика — молча */
    });
  } catch {
    ring = null;
  }
}
/** Остановить звонок: короткое затухание, чтобы не обрывать трель щелчком. */
export function stopRing() {
  if (ringFade) clearInterval(ringFade);
  ringFade = null;
  fading?.pause(); // прежний звонок, который ещё затухал, — сразу тишина
  fading = null;
  const a = ring;
  ring = null;
  if (!a) return;
  fading = a;
  ringFade = setInterval(() => {
    a.volume = Math.max(0, a.volume - 0.08);
    if (a.volume <= 0.01) {
      a.pause();
      fading = null;
      if (ringFade) clearInterval(ringFade);
      ringFade = null;
    }
  }, 20);
}
