#!/usr/bin/env node
// Дымовая проверка Админки 2.0. Только GET-запросы, без изменений.
// По умолчанию проверяет уже запущенную админку на :8787.
// Флаг --ci поднимает сервер из этого репозитория на отдельном порту с фикстурами
// и пропускает проверки, которым нужны OpenCode CLI/сервис и Windows-пути.
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const CI = process.argv.includes("--ci");
const PORT = process.env.OPENCODE_SMOKE_PORT || "8791";
const BASE = process.env.ADMIN_URL || `http://127.0.0.1:${CI ? PORT : 8787}`;
let server = null;
let tmp = null;

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

function makeFixtures() {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-smoke-"));
  const brain = path.join(tmp, "Desktop", "opencode-boost", "brain");
  fs.mkdirSync(path.join(brain, "graphs"), { recursive: true });
  fs.writeFileSync(path.join(brain, "MEMORY.md"), "# Memory\n");
  fs.writeFileSync(path.join(brain, "graphs", "sample.mmd"), "graph LR\nA-->B\n");
  fs.writeFileSync(path.join(brain, "graphs", "sample.json"), '{"kind":"memory","nodes":2,"edges":1}');
  const logDir = path.join(tmp, ".local", "share", "opencode", "log");
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(path.join(logDir, "opencode.log"), 'level=info message="smoke"\n');
  const quotaDir = path.join(tmp, ".config", "opencode", "opencode-quota");
  fs.mkdirSync(quotaDir, { recursive: true });
  fs.writeFileSync(path.join(quotaDir, "settings.jsonc"), "{}\n");
  return tmp;
}

async function waitForServer(tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    try {
      if ((await get("/")).status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Админка не поднялась за отведённое время");
}

async function startServer() {
  const home = makeFixtures();
  server = spawn(process.execPath, [path.join(__dirname, "..", "admin", "server.js")], {
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      USERPROFILE: home,
      APPDATA: path.join(home, "AppData", "Roaming"),
      OPENCODE_ADMIN_PORT: PORT,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  server.stdout.on("data", () => {});
  server.stderr.on("data", () => {});
  await waitForServer();
}

function stopServer() {
  if (server) {
    server.kill();
    server = null;
  }
  if (tmp) {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
    tmp = null;
  }
}

async function main() {
  if (CI) await startServer();
  try {
    const checks = [];
    const add = (name, ok, detail) => {
      checks.push({ name, ok: Boolean(ok) });
      console.log(`${ok ? "OK" : "FAIL"}  ${name} — ${detail}`);
    };
    const skip = (name, reason) => {
      console.log(`SKIP  ${name} — ${reason}`);
    };

    const home = await get("/");
    add("Главная страница", home.status === 200 && home.body.includes('id="overview"') && home.body.includes("pluginDetail"),
      `HTTP ${home.status}, байт ${home.body.length}`);

    const graphs = await get("/api/graphs");
    const graphItems = graphs.json?.items || [];
    add("/api/graphs", graphs.status === 200 && Array.isArray(graphItems) && (!CI || graphItems.length >= 1),
      `HTTP ${graphs.status}, графов: ${graphItems.length}`);

    const logs = await get("/api/logs?lines=5");
    add("/api/logs", logs.status === 200 && Array.isArray(logs.json?.lines) && (!CI || logs.json.lines.length >= 1),
      `HTTP ${logs.status}`);

    const brain = await get("/api/brain");
    add("/api/brain", brain.status === 200 && typeof brain.json?.files === "number" && (!CI || brain.json.files >= 1),
      `HTTP ${brain.status}, файлов: ${brain.json?.files ?? 0}`);

    const quota = await get("/api/quota");
    add("/api/quota", quota.status === 200 && typeof quota.json?.exists === "boolean" && (!CI || quota.json.exists),
      `HTTP ${quota.status}, settings: ${quota.json?.exists}`);

    const obs = await get("/api/obsidian");
    add("/api/obsidian", obs.status === 200 && typeof obs.json?.proxy?.listening === "boolean" && typeof obs.json?.rest?.listening === "boolean",
      `HTTP ${obs.status}, прокси: ${obs.json?.proxy?.listening}, REST: ${obs.json?.rest?.listening}`);

    if (CI) {
      skip("/api/data", "нужны OpenCode CLI и сервис 28894");
      skip("/api/oc-check", "нужны OpenCode CLI и Windows-окружение");
    } else {
      const data = await get("/api/data");
      add("/api/data", data.status === 200 && data.json && typeof data.json === "object", `HTTP ${data.status}`);

      const check = await get("/api/oc-check");
      add("/api/oc-check", check.status === 200 && typeof check.json?.ok === "boolean",
        `HTTP ${check.status}, ok: ${check.json?.ok}`);
    }

    const failed = checks.filter((c) => !c.ok);
    console.log(`\nИтог: ${failed.length ? `проблем ${failed.length}` : "всё_ok"} (проверок: ${checks.length})`);
    process.exitCode = failed.length ? 1 : 0;
  } finally {
    stopServer();
  }
}

main().catch((e) => {
  stopServer();
  console.error("Smoke-проверка не выполнена:", e.message);
  process.exitCode = 1;
});
