#!/usr/bin/env node
// Озвучка допросов через Lumean API.
// Запуск из корня проекта:  node tools/voice/lumean.mjs <команда>
//
// Ключ берётся из .env.local (строка LUMEAN_API_KEY=...). Скрипт его никуда не пишет и не печатает.
//
// Команды (по шагам, каждый шаг согласуем):
//   check                         — проверить ключ: имя, права, лимиты. Ничего не тратит.
//   voices [--gender ...] [--age ...] [--search слово] [--provider elevenlabs,lumvoice]
//                                 — русские голоса каталога: страница tools/voice/out/voices.html с пробами. Ничего не тратит.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://api.lumean.app/api/public";
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out");

function loadKey() {
  if (process.env.LUMEAN_API_KEY) return process.env.LUMEAN_API_KEY.trim();
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) fail("Нет файла .env.local в текущей папке. Запускайте из корня проекта.");
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*LUMEAN_API_KEY\s*=\s*(.+?)\s*$/);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  }
  fail("В .env.local нет строки LUMEAN_API_KEY=...");
}

function fail(msg) {
  console.error("✖ " + msg);
  process.exit(1);
}

const KEY = loadKey();

// Сетевой сбой («fetch failed»): запрос повторяем до 5 раз с паузой. Кроме создания заказа —
// повторный заказ мог бы списать оплату дважды; для заказов есть журнал .orders.json.
async function api(method, path, body) {
  let res;
  for (let attempt = 1; ; attempt++) {
    try {
      res = await fetch(BASE + path, {
        method,
        headers: {
          Accept: "application/json",
          "X-API-KEY": KEY,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      break;
    } catch (e) {
      if ((method === "POST" && path === "/orders") || attempt >= 5) throw new Error(`Нет связи с Lumean (${method} ${path}): ${e.cause?.code || e.message}`);
      console.log(`  … нет связи, повтор ${attempt}/4 через ${attempt * 5} с`);
      await new Promise((r) => setTimeout(r, attempt * 5000));
    }
  }
  return parse(res, method, path);
}

async function parse(res, method, path) {
  let json = null;
  try {
    json = await res.json();
  } catch {}
  if (!res.ok) {
    const reason = json?.reason ? ` (${json.reason})` : "";
    const msg = json?.message ?? res.statusText;
    const errs = json?.errors ? "\n  " + JSON.stringify(json.errors) : "";
    throw new Error(`${method} ${path} → ${res.status}${reason}: ${msg}${errs}`);
  }
  return json?.data ?? json;
}

function args() {
  const a = process.argv.slice(3);
  const o = {};
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith("--")) continue;
    const next = a[i + 1];
    if (next === undefined || next.startsWith("--")) o[a[i].slice(2)] = true;
    else { o[a[i].slice(2)] = next; i++; }
  }
  return o;
}

async function check() {
  const key = await api("GET", "/key");
  console.log("✔ Ключ работает:", key.name);
  console.log("  Права:", (key.permissions || []).join(", ") || "—");
  const need = ["voices.read", "templates.write", "orders.write", "orders.read", "orders.download"];
  const missing = need.filter((p) => !(key.permissions || []).includes(p) && !(key.permissions || []).includes("*"));
  if (missing.length) console.log("  ⚠ Не хватает прав:", missing.join(", "), "— выберите пресет full.");
  if (key.expires_at) console.log("  Действует до:", key.expires_at);
  try {
    const services = await api("GET", "/services");
    const list = (services.items || services || []).filter?.((s) => s.voice_provider || /tts|voice|eleven|cartesia|fish|lum/i.test(s.key || s.service_key || ""));
    if (list?.length) {
      console.log("  Сервисы озвучки:");
      for (const s of list) console.log(`   · ${s.key || s.service_key} — каталог: ${s.voice_provider ?? "—"}, ${s.available === false ? "недоступен" : "доступен"}`);
    }
  } catch (e) {
    console.log("  (список сервисов не получен:", e.message + ")");
  }
  try {
    const subs = await api("GET", "/subscriptions");
    for (const s of subs.items || []) for (const it of s.items || []) console.log(`  Квота: осталось ${it.tokens_remaining} из ${it.token_allowance} токенов`);
  } catch {
    console.log("  (квоту не показать: нет права billing.read — это не мешает)");
  }
}

const CAST = [
  ["Шеф, начальник следственного отдела", "мужчина, 55, old", "грубый, прокуренный, усталый, рубленые фразы; начальник, но свой"],
  ["Кан, судмедэксперт", "мужчина, 61, old", "низкий, медленный, тёплый, чуть хрипловатый; говорит, как со студентом"],
  ["Сеитова, криминалист", "женщина, 34, middle_aged", "ровный, сухой, чёткий, быстрый; без эмоций"],
  ["Абишев, оператор ИВЦ", "мужчина, 27, young", "лёгкий, быстрый, с усталой иронией"],
  ["Бейсенов, криминолог", "мужчина, 52, middle_aged", "поставленный лекторский голос, размеренный, с паузами"],
  ["Фархад", "мужчина, 49, middle_aged", "низкий, спокойный, обаятельный; голос курильщика"],
  ["Валентина Петровна", "женщина, 65, old", "учительский, ровный, сдержанный; горе под контролем"],
  ["Олжас", "мужчина, 22, young", "тихий, сбивчивый, неуверенный"],
  ["Данияр", "мужчина, 40, middle_aged", "сухой, деловой, нервный"],
  ["Ерлан", "мужчина, 35, middle_aged", "грубоватый, отрывистый, бывший сержант"],
  ["Алия", "женщина, 38, middle_aged", "усталая, резкая, после ночного дежурства"],
  ["Виктор, водитель", "мужчина, 50, middle_aged", "простой, говорливый, тёплый"],
  ["Тамара", "женщина, 60, old", "бойкая соседка, быстрый темп"],
  ["Зоя Михайловна", "женщина, 70, old", "старческий, внимательный, неторопливый"],
  ["Роза-апа, вахтёрша", "женщина, 60, old", "строгий, хозяйственный, но добрый"],
];

async function voices() {
  const o = args();
  const providers = (o.provider || "elevenlabs,lumvoice").split(",");
  mkdirSync(OUT, { recursive: true });
  const all = [];
  for (const provider of providers) {
    let got = 0;
    for (let page = 1; page <= 30; page++) {
      const q = new URLSearchParams({ provider, language: "ru", page: String(page), per_page: provider === "elevenlabs" ? "50" : "100" });
      if (o.gender) q.set("gender", o.gender);
      if (o.age) q.set("age", o.age);
      if (o.search) q.set("search", o.search);
      let d;
      try {
        d = await api("GET", "/voices?" + q.toString());
      } catch (e) {
        console.log(`  ${provider}: ${e.message}`);
        break;
      }
      for (const v of d.items || []) all.push({ provider, ...v });
      got += (d.items || []).length;
      if (!d.has_more) break;
    }
    console.log(`${provider}: русских голосов ${got}`);
  }
  writeFileSync(join(OUT, "voices.json"), JSON.stringify(all, null, 2));
  const esc = (x) => String(x ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const rows = all
    .map(
      (v, i) => `<tr><td>${i + 1}</td><td><b>${esc(v.name)}</b><br><small>${esc(v.provider)}</small></td>
<td>${esc([v.gender, v.age, v.accent].filter(Boolean).join(", "))}</td>
<td><small>${esc(String(v.description || "").slice(0, 200))}</small></td>
<td>${v.preview_url ? `<audio controls preload="none" src="${esc(v.preview_url)}"></audio>` : "—"}</td>
<td><code>${esc(v.voice_id)}</code></td></tr>`
    )
    .join("\n");
  const cast = CAST.map(([n, m, d]) => `<tr><td><b>${esc(n)}</b></td><td>${esc(m)}</td><td>${esc(d)}</td></tr>`).join("");
  const html = `<!doctype html><meta charset="utf-8"><title>Голоса для озвучки</title>
<style>body{font:14px system-ui;margin:24px;background:#1b1a17;color:#eee}table{border-collapse:collapse;width:100%;margin-bottom:28px}
td,th{border-bottom:1px solid #333;padding:6px 8px;vertical-align:top;text-align:left}code{font-size:11px;color:#aaa}
input{width:320px;padding:6px;margin:8px 0}audio{height:32px}</style>
<h2>Кого озвучиваем</h2><table><tr><th>Персонаж</th><th>Пол, возраст</th><th>Какой голос нужен</th></tr>${cast}</table>
<h2>Русские голоса каталога (${all.length})</h2>
<input id="f" placeholder="Фильтр: male, old, низкий…" oninput="for(const r of document.querySelectorAll('#v tr'))r.style.display=r.textContent.toLowerCase().includes(this.value.toLowerCase())?'':'none'">
<table id="v">${rows}</table>
<p><small>Пробы LumVoice живут около минуты — если не играет, перезапустите команду voices.</small></p>`;
  const file = join(OUT, "voices.html");
  writeFileSync(file, html);
  console.log(`\nСтраница с голосами: ${file}\nОткройте её:  open ${file}`);
}


// ───────────── Тест на одном персонаже ─────────────
import { createInterface } from "node:readline/promises";
const STATE = join(OUT, "state.json");
const loadState = () => (existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {});
const saveState = (s) => (mkdirSync(OUT, { recursive: true }), writeFileSync(STATE, JSON.stringify(s, null, 2)));
const LEXICON = (() => {
  const f = join(HERE, "lexicon.json");
  if (!existsSync(f)) return [];
  const d = JSON.parse(readFileSync(f, "utf8"));
  // длинные ключи первыми, чтобы «Мамаджанова» не съел «Мамаджанов»
  return Object.entries(d).filter(([k]) => !k.startsWith("_")).sort((a, b) => b[0].length - a[0].length);
})();
const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Подготовка текста к озвучке: словарь произношения, ремарки в скобках убираются.
function speak(text) {
  let t = text.replace(/\s*\([^)]*\)\s*/g, " ");
  // Знаки ударения из текста реплики убираем (тест 20.11: без них голос ошибается реже),
  // а знаки из словаря оставляем: на именах и названиях они срабатывают (брифинг).
  if (!args().stress) t = t.replace(/\u0301/g, "");
  for (const [from, to] of LEXICON) t = t.replace(new RegExp(`(^|[^\\p{L}])${esc(from)}(?=$|[^\\p{L}])`, "gu"), `$1${to}`);
  // Тест 20.11: без знаков ударения голос ошибается реже, чем со знаками или заглавными.
  // Знаки в файлах реплик оставляем как подсказку для людей, в озвучку они не идут (вернуть: --stress).
  return t.replace(/\s+/g, " ").replace(/\s+([.,!?…:;])/g, "$1").trim();
}
const loadLines = (ch) => {
  const f = join(HERE, "lines", `${args().lines || `${ch}-test`}.json`);
  if (!existsSync(f)) fail(`Нет файла реплик ${f}`);
  // --only scene3 (или scene1,scene3): озвучить только эти реплики, остальные файлы не трогать
  const only = args().only ? String(args().only).split(",").map((x) => x.trim()) : null;
  const all = JSON.parse(readFileSync(f, "utf8")).map((l) => ({ ...l, text: speak(l.text) }));
  let picked = only ? all.filter((l) => only.includes(l.id)) : all;
  // --missing: только реплики, для которых ещё нет mp3 в папке озвучки
  if (args().missing) picked = picked.filter((l) => !existsSync(join(OUT, ch, args().lines || "test", `${l.id}.mp3`)));
  if (only && !picked.length) fail(`В ${f} нет реплик ${only.join(", ")}`);
  return picked;
};

async function setup() {
  const o = args();
  const ch = o.character || fail("Укажите --character, например beisenov");
  const want = o.voice || fail('Укажите --voice "Название голоса"');
  const st = loadState();
  if (st[ch]?.template_id && !o.force) {
    console.log(`Шаблон для ${ch} уже есть: голос «${st[ch].voice_name}». Пересоздать — добавьте --force.`);
    return;
  }
  let found = null;
  for (const lang of ["ru", ""]) {
    const q = new URLSearchParams({ provider: "elevenlabs", search: want.split(" - ")[0].split(" — ")[0], page: "1", per_page: "50" });
    if (lang) q.set("language", lang);
    const d = await api("GET", "/voices?" + q.toString());
    const norm = (x) => String(x).toLowerCase().replace(/[—–-]/g, "-").replace(/\s+/g, " ").trim();
    found = (d.items || []).find((v) => norm(v.name) === norm(want)) || (d.items || []).find((v) => norm(v.name).startsWith(norm(want)));
    if (found) break;
  }
  if (!found) fail(`Голос «${want}» не найден в каталоге ElevenLabs.`);
  console.log(`Голос: ${found.name} (${[found.gender, found.age].filter(Boolean).join(", ")})`);
  if (found.preview_url) console.log("Проба: " + found.preview_url);
  const tpl = await api("POST", "/templates", {
    service_key: "elevenlabs",
    name: `Детектив — ${ch}`,
    config: {
      tts_settings: {
        mode: "mode_v1",
        model_id: o.model || "eleven_multilingual_v2",
        voice_id: found.voice_id,
        advanced_voice_settings: true,
        voice_settings: { stability: Number(o.stability ?? 0.5), similarity_boost: 0.75, use_speaker_boost: true, speed: Number(o.speed ?? 1.0) },
      },
    },
  });
  st[ch] = { template_id: tpl.id, voice_id: found.voice_id, voice_name: found.name };
  saveState(st);
  console.log(`✔ Шаблон создан (бесплатно). Дальше: node tools/voice/lumean.mjs estimate --character ${ch}`);
}

async function estimate() {
  const ch = args().character || fail("Укажите --character");
  const st = loadState()[ch] || fail(`Сначала setup для ${ch}`);
  const lines = loadLines(ch);
  let tokens = 0, lmc = 0, chars = 0;
  for (const l of lines) {
    const d = await api("POST", "/orders/chunks/preview", { template_id: st.template_id, input_text: l.text });
    const s = d.summary || d;
    tokens += Number(s.total_price_units || 0);
    lmc += Number(s.cost_lmc || 0);
    chars += l.text.length;
    console.log(`  ${l.id.padEnd(6)} озвучено ${s.voiced_length ?? "?"} зн. → ${s.total_price_units ?? "?"} токенов${s.cost_lmc != null ? `, ${s.cost_lmc} LMC` : ""}${s.min_billable_chars ? ` (минимум ${s.min_billable_chars} зн.)` : ""}`);
    if (args().show) console.log("         " + l.text);
  }
  console.log(`\nИтого ${lines.length} реплик, ${chars} знаков: ${tokens} токенов${lmc ? `, ≈ ${lmc.toFixed(2)} LMC` : ""}. Ничего не списано.`);
  console.log(`Озвучить: node tools/voice/lumean.mjs generate --character ${ch}`);
}

async function generate() {
  const ch = args().character || fail("Укажите --character");
  const st = loadState()[ch] || fail(`Сначала setup для ${ch}`);
  const lines = loadLines(ch);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ans = (await rl.question(`Озвучить ${lines.length} реплик голосом «${st.voice_name}»? Это спишет оплату. Напишите «да»: `)).trim().toLowerCase();
  rl.close();
  if (ans !== "да") return console.log("Отменено, ничего не списано.");
  const dir = join(OUT, ch, args().lines || "test");
  mkdirSync(dir, { recursive: true });
  // Журнал заказов: если связь оборвалась после оплаты, повторный запуск докачает
  // готовый заказ, а не закажет и не оплатит реплику ещё раз.
  const ordersFile = join(dir, ".orders.json");
  const orders = existsSync(ordersFile) ? JSON.parse(readFileSync(ordersFile, "utf8")) : {};
  const saveOrders = () => writeFileSync(ordersFile, JSON.stringify(orders, null, 1));
  let failed = 0;
  for (const l of lines) {
   try {
    const known = orders[l.id];
    let order;
    if (known && known.text === l.text && !known.done) {
      order = { id: known.id };
      console.log(`  ↻ ${l.id}: докачиваю оплаченный заказ`);
    } else {
      order = await api("POST", "/orders", { template_id: st.template_id, input_text: l.text, name: `${ch}-${l.id}` });
      orders[l.id] = { id: order.id, text: l.text, done: false };
      saveOrders();
    }
    let o2;
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      o2 = await api("GET", `/orders/${order.id}`);
      if (["completed", "result_delivered", "partially_completed", "failed", "cancelled", "compensated"].includes(o2.status)) break;
    }
    if (!["completed", "result_delivered"].includes(o2?.status)) {
      console.log(`  ✖ ${l.id}: заказ ${o2?.status ?? "не завершился"}`);
      continue;
    }
    const path = (o2.result?.files || [])[0];
    const link = await api("POST", "/storage/url", { path, download: true });
    const res = await fetch(link.url);
    const file = join(dir, `${l.id}.mp3`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    orders[l.id].done = true;
    saveOrders();
    console.log(`  ✔ ${l.id}: ${file}${o2.price_formatted ? "  (" + o2.price_formatted + ")" : ""}`);
   } catch (e) {
    failed++;
    console.log(`  ✖ ${l.id}: ${e.message}`);
    if (failed >= 3) { console.log("\nТри ошибки подряд — останавливаюсь. Проверьте интернет и запустите ту же команду ещё раз: оплаченное докачается."); break; }
    continue;
   }
   failed = 0;
  }
  console.log(`\nПослушать: open ${dir}`);
}

function envVar(name) {
  if (process.env[name]) return process.env[name].trim();
  for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(new RegExp(`^\\s*${name}\\s*=\\s*(.+?)\\s*$`));
    if (m) return m[1].replace(/^["']|["']$/g, "");
  }
  fail(`В .env.local нет строки ${name}=...`);
}

// Загрузка готовых mp3 в Supabase Storage (бакет voice) и запись ссылки в базу.
// Ссылку в базу пишет только для реплик, у которых в файле реплик есть "db": {table, id, column}.
async function upload() {
  const o = args();
  const ch = o.character || fail("Укажите --character");
  const set = o.lines || `${ch}-test`;
  const lines = JSON.parse(readFileSync(join(HERE, "lines", `${set}.json`), "utf8"));
  const url = envVar("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
  const sk = envVar("SUPABASE_SERVICE_ROLE_KEY");
  const H = { Authorization: `Bearer ${sk}`, apikey: sk };
  const b = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST", headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ id: "voice", name: "voice", public: true }),
  });
  if (b.ok) console.log("✔ Создан бакет voice");
  for (const l of lines) {
    const file = join(OUT, ch, set, `${l.id}.mp3`);
    if (!existsSync(file)) { console.log(`  – ${l.id}: нет файла ${file}, пропуск`); continue; }
    const path = `${o.case || "9704"}/${ch}/${l.id}.mp3`;
    const r = await fetch(`${url}/storage/v1/object/voice/${path}`, {
      method: "POST", headers: { ...H, "Content-Type": "audio/mpeg", "x-upsert": "true" }, body: readFileSync(file),
    });
    if (!r.ok) fail(`Загрузка ${l.id}: ${r.status} ${await r.text()}`);
    const pub = `${url}/storage/v1/object/public/voice/${path}?v=${Date.now()}`;
    let note = "";
    if (l.db) {
      let value = pub;
      if (l.db.index != null || l.db.match) {
        // ссылка внутри jsonb-массива: fixed_questions[index].audio_url или reaction_rules[id=R14].audio_url
        const g = await fetch(`${url}/rest/v1/${l.db.table}?id=eq.${l.db.id}&select=${l.db.column}`, { headers: H });
        const arr = (await g.json())?.[0]?.[l.db.column];
        const i = l.db.match ? (Array.isArray(arr) ? arr.findIndex((x) => x?.id === l.db.match) : -1) : l.db.index;
        if (!Array.isArray(arr) || i < 0 || !arr[i]) fail(`В базе нет ${l.db.column}[${l.db.match ?? l.db.index}]`);
        arr[i][l.db.key || "audio_url"] = pub;
        value = arr;
      }
      const u = await fetch(`${url}/rest/v1/${l.db.table}?id=eq.${l.db.id}`, {
        method: "PATCH", headers: { ...H, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({ [l.db.column]: value }),
      });
      const rows = u.ok ? await u.json() : [];
      if (!u.ok || !rows.length) fail(`Запись в базу ${l.id}: ${u.status} ${u.ok ? "строка не найдена" : await u.text()}`);
      note = ` → ${l.db.table}.${l.db.column}${l.db.index != null || l.db.match ? `[${l.db.match ?? l.db.index}].${l.db.key || "audio_url"}` : ""}`;
    }
    console.log(`  ✔ ${l.id}: загружено${note}`);
  }
  console.log("\nГотово. Перезагрузите игру в браузере.");
}

const cmd = process.argv[2];
const commands = { check, voices, setup, estimate, generate, upload };
if (!commands[cmd]) {
  console.log("Команды: check, voices, setup, estimate, generate, upload. Пример: node tools/voice/lumean.mjs check");
  process.exit(cmd ? 1 : 0);
}
commands[cmd]().catch((e) => fail(e.message));
