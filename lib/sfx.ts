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

/** Удар клавиши: «еле слышно» (вариант E) — лёгкий тик бумаги */
export function key() {
  if (voiceOn()) return;
  const c = ac();
  if (!c) return;
  burst(c, { dur: 0.012, freq: 6500 * (0.9 + Math.random() * 0.2), q: 0.8, gain: 0.035, type: "highpass" });
}

/** Конец абзаца — тот же тик, чуть заметнее, без звонка */
export function carriage() {
  if (voiceOn()) return;
  const c = ac();
  if (!c) return;
  burst(c, { dur: 0.02, freq: 5500, q: 0.8, gain: 0.04, type: "highpass" });
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
