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

/** Удар клавиши: «мягкие клавиши» (вариант A) — тихий короткий щелчок */
export function key() {
  if (voiceOn()) return;
  const c = ac();
  if (!c) return;
  const v = 0.9 + Math.random() * 0.2;
  burst(c, { dur: 0.018, freq: 4200 * v, q: 0.9, gain: 0.15, type: "highpass" });
  burst(c, { dur: 0.03, freq: 1200 * v, q: 1, gain: 0.05 });
}

/** Конец абзаца — чуть более длинный мягкий щелчок, без звонка */
export function carriage() {
  if (voiceOn()) return;
  const c = ac();
  if (!c) return;
  burst(c, { dur: 0.03, freq: 3600, q: 0.9, gain: 0.12, type: "highpass" });
  burst(c, { dur: 0.06, freq: 900, q: 0.8, gain: 0.06, when: 0.01 });
}

/** Штамп: глухой удар и шлепок резины */
export function stamp() {
  const c = ac();
  if (!c) return;
  tone(c, { freq: 140, dur: 0.18, gain: 0.35, slideTo: 60 });
  burst(c, { dur: 0.09, freq: 700, q: 0.7, gain: 0.25, type: "lowpass" });
}

/** Шорох бумаги / листа дела */
export function paper() {
  const c = ac();
  if (!c) return;
  burst(c, { dur: 0.22, freq: 3200, q: 0.5, gain: 0.07, type: "highpass" });
  burst(c, { dur: 0.16, freq: 1800, q: 0.6, gain: 0.05, when: 0.08 });
}

/** Тихий щелчок интерфейса */
export function tick() {
  const c = ac();
  if (!c) return;
  burst(c, { dur: 0.02, freq: 1800, q: 2, gain: 0.06 });
}

let ringTimer: ReturnType<typeof setInterval> | null = null;
/** Звонок старого телефона: две трели, пауза; повторяется до stopRing() */
export function startRing() {
  stopRing();
  const once = () => {
    const c = ac();
    if (!c) return;
    for (let i = 0; i < 14; i++) {
      tone(c, { freq: 1180, dur: 0.045, gain: 0.05, type: "square", when: i * 0.05 });
      tone(c, { freq: 1420, dur: 0.045, gain: 0.04, type: "square", when: i * 0.05 + 0.025 });
    }
  };
  once();
  ringTimer = setInterval(once, 2400);
}
export function stopRing() {
  if (ringTimer) clearInterval(ringTimer);
  ringTimer = null;
}
