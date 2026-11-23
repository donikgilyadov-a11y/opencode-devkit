#!/usr/bin/env node
// Держит MCP-прокси Obsidian живым: проверяет порт каждые 15 секунд
// и перезапускает прокси, если он упал. Без внешних зависимостей.
// Команды: node obsidian-proxy-watchdog.js [status|stop]
const net = require("net");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const HOME = process.env.USERPROFILE || process.env.HOME || "";
const BOOST = path.join(HOME, "Desktop", "opencode-boost");
const PROXY = path.join(BOOST, "scripts", "obsidian-mcp-proxy.js");
const LOG_DIR = path.join(BOOST, "logs");
const LOG_FILE = path.join(LOG_DIR, "obsidian-proxy-watchdog.log");
const PID_FILE = path.join(LOG_DIR, "obsidian-proxy-watchdog.pid");
const PORT = Number(process.env.OBSIDIAN_PROXY_PORT || 27125);
const INTERVAL = 15000;

function log(message) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const stamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `${stamp} ${message}\n`, "utf8");
  } catch {}
}

function probe(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    const done = (value) => { socket.destroy(); resolve(value); };
    socket.setTimeout(1500);
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.once("timeout", () => done(false));
  });
}

function readPid() {
  try { return Number(fs.readFileSync(PID_FILE, "utf8").trim()); } catch { return 0; }
}

const command = process.argv[2] || "watch";

if (command === "status") {
  probe(PORT).then((up) => {
    console.log(`Прокси 127.0.0.1:${PORT}: ${up ? "работает" : "не отвечает"}`);
    console.log(`Watchdog PID: ${readPid() || "не запущен"}`);
    console.log(`Лог: ${LOG_FILE}`);
  });
} else if (command === "stop") {
  const pid = readPid();
  if (pid) {
    try { process.kill(pid); log(`watchdog остановлен (PID ${pid})`); console.log(`Watchdog PID ${pid} остановлен`); }
    catch (e) { console.log(`Не удалось остановить PID ${pid}: ${e.message}`); }
  } else {
    console.log("Watchdog не запущен");
  }
} else {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.writeFileSync(PID_FILE, String(process.pid), "utf8");
  log(`watchdog запущен (PID ${process.pid}), порт ${PORT}`);

  async function tick() {
    if (await probe(PORT)) return;
    try {
      const child = spawn(process.execPath, [PROXY], {
        cwd: path.dirname(PROXY),
        detached: true,
        windowsHide: true,
        stdio: "ignore",
      });
      child.unref();
      log(`прокси перезапущен (PID ${child.pid})`);
    } catch (e) {
      log(`ошибка перезапуска: ${e.message}`);
    }
  }

  tick();
  const timer = setInterval(tick, INTERVAL);
  process.on("SIGTERM", () => { clearInterval(timer); try { fs.unlinkSync(PID_FILE); } catch {} process.exit(0); });
}
