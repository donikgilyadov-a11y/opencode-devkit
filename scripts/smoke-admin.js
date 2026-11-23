#!/usr/bin/env node
// Дымовая проверка Админки 2.0. Только GET-запросы, без изменений.
const http = require("http");

const BASE = process.env.ADMIN_URL || "http://127.0.0.1:8787";

function get(apiPath) {
  return new Promise((resolve, reject) => {
    const req = http.get(BASE + apiPath, { timeout: 10000 }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        let json = null;
        try { json = JSON.parse(body); } catch {}
        resolve({ status: res.statusCode, body, json });
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Таймаут: ${apiPath}`));
    });
  });
}

async function main() {
  const checks = [];
  const add = (name, ok, detail) => {
    checks.push({ name, ok: Boolean(ok) });
    console.log(`${ok ? "OK" : "FAIL"}  ${name} — ${detail}`);
  };

  const home = await get("/");
  add("Главная страница", home.status === 200 && home.body.includes('id="overview"') && home.body.includes("pluginDetail"),
    `HTTP ${home.status}, байт ${home.body.length}`);

  const data = await get("/api/data");
  add("/api/data", data.status === 200 && data.json && typeof data.json === "object", `HTTP ${data.status}`);

  const graphs = await get("/api/graphs");
  add("/api/graphs", graphs.status === 200 && Array.isArray(graphs.json?.items),
    `HTTP ${graphs.status}, графов: ${graphs.json?.items?.length ?? 0}`);

  const logs = await get("/api/logs?lines=5");
  add("/api/logs", logs.status === 200 && Array.isArray(logs.json?.lines), `HTTP ${logs.status}`);

  const brain = await get("/api/brain");
  add("/api/brain", brain.status === 200 && typeof brain.json?.files === "number",
    `HTTP ${brain.status}, файлов: ${brain.json?.files ?? 0}`);

  const quota = await get("/api/quota");
  add("/api/quota", quota.status === 200 && typeof quota.json?.exists === "boolean",
    `HTTP ${quota.status}, settings: ${quota.json?.exists}`);

  const obs = await get("/api/obsidian");
  add("/api/obsidian", obs.status === 200 && typeof obs.json?.proxy?.listening === "boolean",
    `HTTP ${obs.status}, прокси: ${obs.json?.proxy?.listening ? "ok" : "нет"}, автозапуск: ${obs.json?.autostart ? "есть" : "нет"}`);

  const check = await get("/api/oc-check");
  add("/api/oc-check", check.status === 200 && typeof check.json?.ok === "boolean",
    `HTTP ${check.status}, ok: ${check.json?.ok}`);

  const failed = checks.filter((c) => !c.ok);
  console.log(`\nИтог: ${failed.length ? `проблем ${failed.length}` : "всё_ok"} (проверок: ${checks.length})`);
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((e) => {
  console.error("Smoke-проверка не выполнена:", e.message);
  process.exitCode = 1;
});
