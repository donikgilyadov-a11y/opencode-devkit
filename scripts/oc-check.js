#!/usr/bin/env node
// Самопроверка OpenCode Boost: конфиги, сервис, плагины, мозг, админка, вики.
// Без внешних зависимостей. Вывод: Markdown-отчёт и/или JSON для админки.
const fs = require("fs");
const path = require("path");
const http = require("http");
const os = require("os");
const { execFile } = require("child_process");

const HOME = process.env.USERPROFILE || os.homedir();
const CONFIG = path.join(HOME, ".config", "opencode");
const BOOST = path.join(HOME, "Desktop", "opencode-boost");
const WIKI = path.join(HOME, "Desktop", "opencode-wiki");
const CLI = process.env.OPENCODE_CLI ||
  path.join(process.env.LOCALAPPDATA || "", "Programs", "@opencode-aidesktop", "resources", "opencode-cli.exe");
const GIT = process.env.OPENCODE_GIT ||
  path.join("C:\\Program Files", "Git", "cmd", "git.exe");
const ADMIN_PORT = Number(process.env.OPENCODE_ADMIN_PORT || 8787);
const RAW = process.argv.slice(2);
const JSON_MODE = RAW.includes("--json");

function run(file, args, timeout = 20000) {
  return new Promise((resolve) => {
    execFile(file, args, { timeout, maxBuffer: 8 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
      resolve({ ok: !err, out: String(stdout || ""), err: String(stderr || ""), message: err ? String(err.message || err) : "" });
    });
  });
}

function readJsonc(file) {
  try {
    let text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    let out = "";
    let inString = false;
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const n = text[i + 1];
      if (inString) {
        out += c;
        if (quoted) { quoted = false; }
        else if (c === "\\") { quoted = true; }
        else if (c === '"') { inString = false; }
        continue;
      }
      if (c === '"') { inString = true; out += c; continue; }
      if (c === "/" && n === "/") {
        while (i < text.length && text[i] !== "\n" && text[i] !== "\r") i++;
        if (text[i] === "\r" && text[i + 1] === "\n") i++;
        out += "\n";
        continue;
      }
      if (c === "/" && n === "*") {
        i += 2;
        while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
        i++;
        continue;
      }
      out += c;
    }
    out = out.replace(/,(\s*[}\]])/g, "$1");
    return JSON.parse(out);
  } catch (e) {
    return { __error: e.message };
  }
}

function count(dir, ext, mode = "file") {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => {
      if (mode === "dir" ? !d.isDirectory() : !d.isFile()) return false;
      return !ext || d.name.endsWith(ext);
    }).length;
  } catch {
    return 0;
  }
}

function httpJson(port, apiPath) {
  return new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port, path: apiPath, timeout: 5000 }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, error: "not json" }); }
      });
    });
    req.on("error", (e) => resolve({ status: 0, error: e.message }));
    req.on("timeout", () => { req.destroy(); resolve({ status: 0, error: "timeout" }); });
  });
}

function tcpUp(port) {
  return new Promise((resolve) => {
    const net = require("net");
    const socket = net.connect({ host: "127.0.0.1", port });
    const done = (value) => { socket.destroy(); resolve(value); };
    socket.setTimeout(1500);
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.once("timeout", () => done(false));
  });
}

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function scanStrays() {
  const bad = [];
  const rx = /[\u4e00-\u9fff\u0600-\u06ff\uac00-\ud7af]/g;
  function walk(dir) {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      if ([".git", "node_modules", "dist", "build", "coverage", ".obsidian"].includes(d.name)) continue;
      const full = path.join(dir, d.name);
      if (d.isDirectory()) walk(full);
      else if (/\.(md|js|json|html|cmd)$/i.test(d.name)) {
        const text = fs.readFileSync(full, "utf8");
        text.split(/\r?\n/).forEach((line, i) => {
          if (rx.test(line)) { bad.push(`${path.relative(BOOST, full)}:${i + 1}`); rx.lastIndex = 0; }
        });
      }
    }
  }
  for (const root of [BOOST, WIKI]) {
    if (fs.existsSync(root)) walk(root);
  }
  return bad;
}

async function main() {
  const items = [];
  const add = (name, ok, detail) => items.push({ name, ok: Boolean(ok), detail: String(detail) });

  const info = await run(CLI, ["api", "get", "/api/info"]);
  let version = "";
  try { version = JSON.parse(info.out).version || ""; } catch {}
  add("Сервис OpenCode", Boolean(version), version || info.message || "нет ответа");

  const plug = await run(CLI, ["api", "get", "/api/plugin"]);
  let plugins = [];
  try {
    const p = JSON.parse(plug.out);
    plugins = Array.isArray(p) ? p : p.data || p.plugins || [];
  } catch {}
  const active = plugins.filter((p) => p && p.state?.status === "active" && !String(p.id || "").startsWith("opencode."));
  add("Плагины active", active.length >= 3, active.map((p) => `${p.id || p.name || "?"}@${p.source?.version || p.version || "local"}`).join(", ") || "не найдены");

  const need = ["opencode.jsonc", "cli.json", "opencode-notifier.json", "dcp.jsonc"];
  for (const f of need) {
    const p = path.join(CONFIG, f);
    const exists = fs.existsSync(p);
    const parsed = exists ? readJsonc(p) : null;
    add(`Конфиг ${f}`, exists && !parsed?.__error, parsed?.__error || (exists ? "ok" : "отсутствует"));
  }

  const cfg = readJsonc(path.join(CONFIG, "opencode.jsonc"));
  add("Инструкции подключены", Array.isArray(cfg.instructions) && cfg.instructions.length > 0,
    (cfg.instructions || []).join(", ") || "нет");
  add("Плагины в конфиге", Array.isArray(cfg.plugins) && cfg.plugins.length >= 2,
    (cfg.plugins || []).join(", ") || "нет");

  add("Навыки boost", count(path.join(BOOST, "skills"), null, "dir") >= 7, `${count(path.join(BOOST, "skills"), null, "dir")} шт.`);
  add("Команды", count(path.join(CONFIG, "commands"), ".md") >= 8, `${count(path.join(CONFIG, "commands"), ".md")} шт.`);
  add("Агенты", count(path.join(CONFIG, "agents"), ".md") >= 2, `${count(path.join(CONFIG, "agents"), ".md")} шт.`);
  add("Локальные плагины", count(path.join(CONFIG, "plugins"), null, "dir") >= 3, `${count(path.join(CONFIG, "plugins"), null, "dir")} шт.`);

  const brainFiles = ["MEMORY.md", path.join("memory", "LONG_TERM.md"), path.join("memory", `${today()}.md`)];
  const missingBrain = brainFiles.filter((f) => !fs.existsSync(path.join(BOOST, "brain", f)));
  add("Файлы мозга", missingBrain.length === 0, missingBrain.length ? `нет: ${missingBrain.join(", ")}` : "ok");
  add("Решения", count(path.join(BOOST, "brain", "decisions"), ".md") >= 3, `${count(path.join(BOOST, "brain", "decisions"), ".md")} шт.`);
  add("Графы", count(path.join(BOOST, "brain", "graphs"), ".mmd") >= 3, `${count(path.join(BOOST, "brain", "graphs"), ".mmd")} шт.`);

  const data = await httpJson(ADMIN_PORT, "/api/data");
  add("Админка /api/data", data.status === 200, `HTTP ${data.status}`);
  const graphs = await httpJson(ADMIN_PORT, "/api/graphs");
  add("Админка /api/graphs", graphs.status === 200 && Array.isArray(graphs.data?.items),
    `HTTP ${graphs.status}, графов: ${graphs.data?.items?.length ?? 0}`);

  const proxyUp = await tcpUp(27125);
  const restUp = await tcpUp(27123);
  const shortcut = path.join(process.env.APPDATA || path.join(HOME, "AppData", "Roaming"),
    "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "OpenCode Obsidian Proxy.lnk");
  const autostart = fs.existsSync(shortcut);
  add("Obsidian MCP мост", proxyUp && restUp && autostart,
    `прокси 27125: ${proxyUp ? "ok" : "нет"}, REST 27123: ${restUp ? "ok" : "нет"}, автозапуск: ${autostart ? "есть" : "нет"}`);

  const strays = scanStrays();
  add("Мусорные символы", strays.length === 0, strays.length ? strays.slice(0, 8).join(", ") : "SUSPECT_LINES=0");

  const git = await run(GIT, ["-C", WIKI, "log", "-1", "--pretty=format:%h %s"], 10000);
  add("Вики: последний коммит", git.ok, git.out.trim() || git.message);

  const failed = items.filter((x) => !x.ok);
  const report = {
    date: today(),
    ok: failed.length === 0,
    total: items.length,
    failed: failed.length,
    items,
  };

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(report, null, 2));
    return;
  }

  const lines = [
    `# Проверка OpenCode Boost — ${today()}`,
    "",
    `Итог: ${report.ok ? "всё_ok" : `проблем: ${report.failed}`} (проверок: ${report.total})`,
    "",
    "| Проверка | Статус | Детали |",
    "| --- | --- | --- |",
    ...items.map((x) => `| ${x.name} | ${x.ok ? "OK" : "FAIL"} | ${x.detail.replace(/\|/g, "\\|")} |`),
    "",
  ];
  const dir = path.join(BOOST, "brain", "reports");
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `oc-check-${today()}.md`);
  fs.writeFileSync(out, lines.join("\n"), "utf8");
  console.log(lines.join("\n"));
  console.log(`\nОтчёт: ${out}`);
  process.exitCode = report.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}

module.exports = { readJsonc, count, httpJson, scanStrays, today, run, tcpUp };
