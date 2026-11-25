#!/usr/bin/env node
// OpenCode Admin — локальный дашборд. Без зависимостей.
// Слушает только 127.0.0.1 и использует CLI `opencode api` для авторизованных запросов.
const http = require("http");
const net = require("net");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const PORT = Number(process.env.OPENCODE_ADMIN_PORT || 8787);
const HOST = "127.0.0.1";
const CLI = process.env.OPENCODE_CLI ||
  path.join(process.env.LOCALAPPDATA || "", "Programs", "@opencode-aidesktop", "resources", "opencode-cli.exe");
const HTML = path.join(__dirname, "index.html");
const GRAPH_HTML = path.join(__dirname, "graph.html");
const GRAPHS = path.join(process.env.USERPROFILE || "", "Desktop", "opencode-boost", "brain", "graphs");
const CHECK_SCRIPT = path.join(__dirname, "..", "scripts", "oc-check.js");
const LOG = path.join(process.env.USERPROFILE || "", ".local", "share", "opencode", "log", "opencode.log");
const BRAIN = path.join(process.env.USERPROFILE || "", "Desktop", "opencode-boost", "brain");
const QUOTA_SETTINGS = path.join(process.env.USERPROFILE || "", ".config", "opencode", "opencode-quota", "settings.jsonc");
const STARTUP_LNK = path.join(process.env.APPDATA || path.join(process.env.USERPROFILE || "", "AppData", "Roaming"),
  "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "OpenCode Obsidian Proxy.lnk");
const WATCHDOG_PID = path.join(__dirname, "..", "logs", "obsidian-proxy-watchdog.pid");
const WATCHDOG_LOG = path.join(__dirname, "..", "logs", "obsidian-proxy-watchdog.log");
const SKILLS = path.join(process.env.USERPROFILE || "", "Desktop", "opencode-boost", "skills");
const SKILL_LINT = path.join(__dirname, "..", "scripts", "skill-lint.js");

function redact(text) {
  return String(text)
    .replace(/(authorization|api[_-]?key|token|password|secret|cookie)\s*[:=]\s*[^\s,;}]+/gi, "$1: ***")
    .replace(/gh[pousr]_[A-Za-z0-9]{16,}/g, "gh_***")
    .replace(/sk-[A-Za-z0-9]{16,}/g, "sk-***");
}

function tailLines(file, count) {
  try {
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    return lines.slice(-count).map(redact);
  } catch (e) {
    return ["Лог недоступен: " + e.message];
  }
}

function ocApi(method, apiPath) {
  return new Promise((resolve) => {
    if (!/^\/api\//.test(apiPath)) return resolve({ error: "Недопустимый путь" });
    execFile(CLI, ["api", method, apiPath], {
      timeout: 20000,
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
    }, (err, stdout) => {
      if (err && !stdout) return resolve({ error: String(err.message || err).slice(0, 400) });
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        resolve({ raw: String(stdout || "").slice(0, 4000), error: err ? String(err.message || err).slice(0, 400) : undefined });
      }
    });
  });
}

function probePort(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    const done = (value) => { socket.destroy(); resolve(value); };
    socket.setTimeout(1500);
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.once("timeout", () => done(false));
  });
}

function json(res, code, data) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  if (url.pathname === "/" || url.pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(fs.readFileSync(HTML));
  }

  if (url.pathname === "/graph.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(fs.readFileSync(GRAPH_HTML));
  }

  if (url.pathname === "/api/graphs") {
    let items = [];
    try {
      items = fs.readdirSync(GRAPHS)
        .filter((f) => f.endsWith(".mmd"))
        .map((f) => {
          const base = path.join(GRAPHS, f);
          let summary = {};
          try { summary = JSON.parse(fs.readFileSync(base.replace(/\.mmd$/, ".json"), "utf8")); } catch {}
          const stat = fs.statSync(base);
          return {
            name: f.replace(/\.mmd$/, ""),
            mermaid: fs.readFileSync(base, "utf8"),
            kind: summary.kind || "custom",
            nodes: summary.nodes || 0,
            edges: summary.edges || 0,
            modified: stat.mtimeMs,
          };
        })
        .sort((a, b) => b.modified - a.modified);
    } catch {}
    return json(res, 200, { dir: GRAPHS, items });
  }

  if (url.pathname === "/api/logs") {
    const lines = Math.min(300, Math.max(1, Number(url.searchParams.get("lines")) || 80));
    return json(res, 200, { file: LOG, lines: tailLines(LOG, lines) });
  }

  if (url.pathname === "/api/brain") {
    let memory = "";
    let files = 0;
    try { memory = fs.readFileSync(path.join(BRAIN, "MEMORY.md"), "utf8").slice(0, 8000); } catch {}
    try { files = fs.readdirSync(BRAIN, { recursive: true }).filter((f) => String(f).endsWith(".md")).length; } catch {}
    return json(res, 200, { dir: BRAIN, files, memory });
  }

  if (url.pathname === "/api/obsidian") {
    const [proxy, rest] = await Promise.all([probePort(27125), probePort(27123)]);
    let watchdogPid = 0;
    try { watchdogPid = Number(fs.readFileSync(WATCHDOG_PID, "utf8").trim()); } catch {}
    return json(res, 200, {
      proxy: { port: 27125, listening: proxy },
      rest: { port: 27123, listening: rest },
      autostart: fs.existsSync(STARTUP_LNK) ? STARTUP_LNK : "",
      watchdogPid,
      log: tailLines(WATCHDOG_LOG, 5),
    });
  }

  if (url.pathname === "/api/quota") {
    const exists = fs.existsSync(QUOTA_SETTINGS);
    return json(res, 200, { file: QUOTA_SETTINGS, exists, note: exists ? "Файл настроек найден" : "Используются значения по умолчанию" });
  }

  if (url.pathname === "/api/skills") {
    return new Promise((resolve) => {
      execFile(process.execPath, [SKILL_LINT, SKILLS, "--json"], {
        timeout: 30000,
        maxBuffer: 4 * 1024 * 1024,
        windowsHide: true,
      }, (err, stdout) => {
        if (err && !stdout) return resolve(json(res, 500, { error: String(err.message || err).slice(0, 400) }));
        try {
          const lint = JSON.parse(stdout.trim());
          return resolve(json(res, 200, {
            dir: SKILLS,
            skills: lint.skills,
            errors: lint.errors,
            warnings: lint.warnings,
            findings: lint.findings || [],
            index: fs.existsSync(path.join(SKILLS, "INDEX.md")),
            triggers: fs.existsSync(path.join(SKILLS, "TRIGGERS.md")),
          }));
        } catch {
          return resolve(json(res, 500, { error: "Не удалось разобрать отчёт линтера", raw: String(stdout || "").slice(0, 2000) }));
        }
      });
    });
  }

  if (url.pathname === "/api/oc-check") {
    return new Promise((resolve) => {
      execFile(process.execPath, [CHECK_SCRIPT, "--json"], {
        timeout: 60000,
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true,
      }, (err, stdout) => {
        if (err && !stdout) return resolve(json(res, 500, { error: String(err.message || err).slice(0, 400) }));
        try {
          resolve(json(res, 200, JSON.parse(stdout.trim())));
        } catch {
          resolve(json(res, 500, { error: "Не удалось разобрать отчёт", raw: String(stdout || "").slice(0, 2000) }));
        }
      });
    });
  }

  if (url.pathname === "/api/data") {
    const endpoints = {
      info: ["get", "/api/info"],
      location: ["get", "/api/location"],
      agents: ["get", "/api/agent"],
      plugins: ["get", "/api/plugin"],
      mcp: ["get", "/api/mcp"],
      models: ["get", "/api/model"],
      defaultModel: ["get", "/api/model/default"],
      sessions: ["get", "/api/session?limit=10"],
      projects: ["get", "/api/project"],
      providers: ["get", "/api/provider"],
    };
    const entries = await Promise.all(
      Object.entries(endpoints).map(async ([key, [method, p]]) => [key, await ocApi(method, p)])
    );
    return json(res, 200, Object.fromEntries(entries));
  }

  if (url.pathname === "/api/call") {
    const method = (url.searchParams.get("method") || "get").toLowerCase();
    const apiPath = url.searchParams.get("path") || "";
    // Разрешаем только чтение и безопасную перезагрузку конфигурации.
    if (method !== "get" && !(method === "post" && apiPath === "/api/location/reload")) {
      return json(res, 403, { error: "Метод запрещён" });
    }
    return json(res, 200, await ocApi(method, apiPath));
  }

  return json(res, 404, { error: "Not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`OpenCode Admin: http://${HOST}:${PORT}`);
  console.log(`CLI: ${CLI}`);
});
