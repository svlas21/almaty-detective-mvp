#!/usr/bin/env node
// Озвучка допросов через Lumean API.
// Запуск из корня проекта:  node tools/voice/lumean.mjs <команда>
//
// Ключ берётся из .env.local (строка LUMEAN_API_KEY=...). Скрипт его никуда не пишет и не печатает.
//
// Команды (по шагам, каждый шаг согласуем):
//   check                         — проверить ключ: имя, права, лимиты. Ничего не тратит.
//   voices [--gender male|female] [--age young|middle_aged|old] [--search слово] [--provider elevenlabs]
//                                 — русские голоса каталога со ссылками на пробные фрагменты.
//                                   Сохраняет список в tools/voice/out/voices.json. Ничего не тратит.

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

async function voices() {
  const o = args();
  const provider = o.provider || "elevenlabs";
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const q = new URLSearchParams({ provider, language: "ru", page: String(page), per_page: provider === "elevenlabs" ? "50" : "100" });
    if (o.gender) q.set("gender", o.gender);
    if (o.age) q.set("age", o.age);
    if (o.search) q.set("search", o.search);
    const d = await api("GET", "/voices?" + q.toString());
    all.push(...(d.items || []));
    if (!d.has_more) break;
  }
  mkdirSync(OUT, { recursive: true });
  const file = join(OUT, `voices-${provider}.json`);
  writeFileSync(file, JSON.stringify(all, null, 2));
  console.log(`Найдено русских голосов (${provider}): ${all.length}. Список: ${file}\n`);
  all.forEach((v, i) => {
    const meta = [v.gender, v.age, v.accent].filter(Boolean).join(", ");
    console.log(`${String(i + 1).padStart(3)}. ${v.name}${meta ? "  [" + meta + "]" : ""}`);
    if (v.description) console.log("     " + String(v.description).replace(/\s+/g, " ").slice(0, 140));
    console.log("     id: " + v.voice_id + (v.preview_url ? "\n     ▶ " + v.preview_url : ""));
  });
}

const cmd = process.argv[2];
const commands = { check, voices };
if (!commands[cmd]) {
  console.log("Команды: check, voices. Пример: node tools/voice/lumean.mjs check");
  process.exit(cmd ? 1 : 0);
}
commands[cmd]().catch((e) => fail(e.message));
