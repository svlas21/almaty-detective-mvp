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

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      Accept: "application/json",
      "X-API-KEY": KEY,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
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
  for (let i = 0; i < a.length; i++) if (a[i].startsWith("--")) o[a[i].slice(2)] = a[i + 1], i++;
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

const cmd = process.argv[2];
const commands = { check, voices };
if (!commands[cmd]) {
  console.log("Команды: check, voices. Пример: node tools/voice/lumean.mjs check");
  process.exit(cmd ? 1 : 0);
}
commands[cmd]().catch((e) => fail(e.message));
