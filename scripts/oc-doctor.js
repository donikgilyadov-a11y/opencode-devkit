#!/usr/bin/env node
// Авто-врач OpenCode Boost: planner + безопасное применение типичных фиксов.
// По умолчанию только план. Применение: --apply (бэкапы создаются автоматически).
// Дополнительно: --json, --only=<id>, --service (разрешить перезапуск сервиса).
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const check = require("./oc-check");

const HOME = process.env.USERPROFILE || os.homedir();
const CONFIG = path.join(HOME, ".config", "opencode");
const BOOST = path.join(HOME, "Desktop", "opencode-boost");
const DEVKIT = path.join(HOME, "Desktop", "opencode-devkit");
const WIKI = path.join(HOME, "Desktop", "opencode-wiki");
const CLI = process.env.OPENCODE_CLI ||
  path.join(process.env.LOCALAPPDATA || "", "Programs", "@opencode-aidesktop", "resources", "opencode-cli.exe");
const ADMIN_PORT = Number(process.env.OPENCODE_ADMIN_PORT || 8787);
const PROXY = path.join(BOOST, "scripts", "obsidian-mcp-proxy.js");
const WATCHDOG = path.join(BOOST, "scripts", "obsidian-proxy-watchdog.js");
const SHORTCUT = path.join(
  process.env.APPDATA || path.join(HOME, "AppData", "Roaming"),
  "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "OpenCode Obsidian Proxy.lnk"
);
const RAW = process.argv.slice(2);
const APPLY = RAW.includes("--apply");
const JSON_MODE = RAW.includes("--json");
const ALLOW_SERVICE = RAW.includes("--service");
const ONLY = (RAW.find((a) => a.startsWith("--only=")) || "").slice(7);
const RUN_STAMP = stamp();
const BACKUP_ROOT = process.env.OPENCODE_DOCTOR_BACKUP_ROOT ||
  path.join(BOOST, "brain", "reports", "doctor-backups", RUN_STAMP);

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function clock() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "skill";
}

function parseFrontmatter(text) {
  const lines = String(text).split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  const end = lines.indexOf("---", 1);
  if (end < 1) return null;
  const raw = lines.slice(0, end + 1).join("\n");
  return { raw, body: lines.slice(1, end).join("\n") };
}

function replaceTokens(text) {
  return String(text)
    .replace(/<HOME>/g, HOME.replace(/\\/g, "/"))
    .replace(/%USERPROFILE%/g, HOME);
}

function backupRoot() {
  return BACKUP_ROOT;
}

function backupFile(file) {
  if (!fs.existsSync(file)) return null;
  let rel = path.relative(HOME, file);
  if (rel.startsWith("..")) rel = path.basename(file);
  const dest = path.join(backupRoot(), rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(file, dest);
  return dest;
}

function writeText(file, text) {
  const backup = backupFile(file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, String(text), "utf8");
  return backup ? `бэкап: ${path.relative(HOME, backup)}` : "новый файл";
}

function startDetached(file, args, cwd) {
  const child = spawn(file, args, { cwd, detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
  return child.pid;
}

function skillFixes(root, add) {
  if (!fs.existsSync(root)) return;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(root, entry.name, "SKILL.md");
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    const fm = parseFrontmatter(text);
    const wanted = slug(entry.name);
    if (fm) {
      const m = fm.body.match(/^name:\s*(.+)$/m);
      if (m && m[1].trim() !== wanted) {
        add(`skill-name:${entry.name}`, `Исправить name: навыка ${entry.name}`, "auto",
          `${m[1].trim()} → ${wanted}`, async () => {
            const current = fs.readFileSync(file, "utf8");
            const currentFm = parseFrontmatter(current);
            if (!currentFm) throw new Error("фронтматтер исчез");
            const newFm = currentFm.raw.replace(/^name:\s*.+$/m, `name: ${wanted}`);
            return writeText(file, current.replace(currentFm.raw, newFm));
          });
      }
    }
    if (text.includes("$ARGUMENTS")) {
      add(`skill-arguments:${entry.name}`, `Убрать $ARGUMENTS из ${entry.name}`, "auto",
        "литерал в SKILL.md заменяется на обычную фразу", async () => {
          const current = fs.readFileSync(file, "utf8");
          return writeText(file, current.split("$ARGUMENTS").join("Сделай то, что просит пользователь."));
        });
    }
  }
}

async function buildActions() {
  const actions = [];
  const add = (id, title, severity, detail, fix) =>
    actions.push({ id, title, severity, detail, fix });

  const info = await check.run(CLI, ["api", "get", "/api/info"]);
  let version = "";
  try { version = JSON.parse(info.out).version || ""; } catch {}
  if (!version) {
    add("service", "Перезапустить сервис OpenCode", ALLOW_SERVICE ? "auto" : "manual",
      ALLOW_SERVICE ? `нет ответа: ${info.message || "нет версии"}` :
        `нет ответа; для авто-фикса добавь --service (${info.message || "нет версии"})`,
      async () => {
        const r = await check.run(CLI, ["service", "restart"], 40000);
        if (!r.ok) throw new Error(r.message || "service restart failed");
        return `сервис перезапущен: ${(r.out || r.err || "").trim().slice(0, 200)}`;
      });
  }

  const admin = await check.httpJson(ADMIN_PORT, "/api/data");
  if (admin.status !== 200) {
    add("admin", "Запустить Админку 2.0", "auto", `HTTP ${admin.status}`, async () => {
      const pid = startDetached(process.execPath, [path.join(BOOST, "admin", "server.js")], BOOST);
      return `админка запущена, PID ${pid}`;
    });
  }

  const [proxyUp, restUp] = await Promise.all([check.tcpUp(27125), check.tcpUp(27123)]);
  if (!proxyUp && restUp) {
    add("proxy", "Запустить Obsidian MCP-прокси", "auto", "27125 не слушает, REST 27123 жив", async () => {
      const pid = startDetached(process.execPath, [PROXY], BOOST);
      return `прокси запущен, PID ${pid}`;
    });
  }
  if (!restUp) {
    add("obsidian", "Obsidian Local REST API не отвечает", "manual",
      "порт 27123 закрыт — проверь, что Obsidian открыт с vault brain и плагин включён");
  }
  if (!fs.existsSync(SHORTCUT)) {
    add("startup", "Создать автозапуск watchdog", "auto",
      "нет ярлыка в Startup", async () => {
        const q = (s) => String(s).replace(/'/g, "''");
        const cmd = `$ws = New-Object -ComObject WScript.Shell; ` +
          `$s = $ws.CreateShortcut('${q(SHORTCUT)}'); ` +
          `$s.TargetPath = '${q(process.execPath)}'; ` +
          `$s.Arguments = '"${q(WATCHDOG)}"'; ` +
          `$s.WindowStyle = 7; $s.Save();`;
        const r = await check.run("powershell", ["-NoProfile", "-NonInteractive", "-Command", cmd], 20000);
        if (!r.ok) throw new Error(r.message || "не удалось создать ярлык");
        return "ярлык автозапуска создан";
      });
  }

  const examples = [
    ["cli.json", "cli.json.example"],
    ["opencode-notifier.json", "opencode-notifier.json.example"],
    ["dcp.jsonc", "dcp.jsonc.example"],
  ];
  for (const [name, example] of examples) {
    const dest = path.join(CONFIG, name);
    const src = path.join(DEVKIT, "config-examples", example);
    if (fs.existsSync(dest)) continue;
    if (!fs.existsSync(src)) {
      add(`config:${name}`, `Восстановить ${name}`, "manual", "нет исходника в DevKit/config-examples");
      continue;
    }
    add(`config:${name}`, `Восстановить ${name}`, "auto", `из ${example}`, async () => {
      const text = replaceTokens(fs.readFileSync(src, "utf8"));
      return writeText(dest, text);
    });
  }

  const daily = path.join(BOOST, "brain", "memory", `${check.today()}.md`);
  if (!fs.existsSync(daily)) {
    add("brain-daily", "Создать дневник мозга", "auto", `${check.today()}.md отсутствует`, async () => {
      const text = `# Дневник ${check.today()}\n\n- [${clock()}] авто-врач — создан дневник после проверки.\n`;
      return writeText(daily, text);
    });
  }

  skillFixes(path.join(BOOST, "skills"), add);
  skillFixes(path.join(DEVKIT, "skills"), add);

  const strays = check.scanStrays();
  if (strays.length) {
    add("strays", "Посторонние символы в MD/JS", "manual", strays.slice(0, 8).join(", "));
  }

  if (fs.existsSync(path.join(WIKI, "scripts", "check-links.js"))) {
    const links = await check.run(process.execPath, [path.join(WIKI, "scripts", "check-links.js")], 20000);
    if (!links.ok) {
      add("wiki-links", "Битые ссылки вики", "manual",
        String(links.out || links.message || "").trim().slice(0, 400));
    }
  }

  return actions;
}

function printReport(report) {
  const lines = [
    `# Авто-врач OpenCode Boost — ${report.date}`,
    "",
    `Режим: **${report.mode}**. Действий: ${report.actions.length}.`,
    "",
    "| Действие | Статус | Детали |",
    "| --- | --- | --- |",
    ...report.actions.map((a) =>
      `| ${a.title} | ${a.status} | ${String(a.detail || "").replace(/\|/g, "\\|")} |`),
    "",
    `Бэкапы: \`${report.backupRoot}\``,
  ];
  if (report.recheck) {
    lines.push(`Перепроверка: ${report.recheck.ok ? "всё_ok" : `проблем ${report.recheck.failed}`} (${report.recheck.total}).`);
  }
  lines.push("");
  const dir = path.join(BOOST, "brain", "reports");
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `oc-doctor-${report.date}.md`);
  fs.writeFileSync(out, lines.join("\n"), "utf8");
  console.log(lines.join("\n"));
  console.log(`\nОтчёт: ${out}`);
}

async function main() {
  let actions = await buildActions();
  if (ONLY) actions = actions.filter((a) => a.id.includes(ONLY));

  const results = [];
  if (APPLY) {
    for (const a of actions) {
      if (a.severity === "manual") {
        results.push({ id: a.id, title: a.title, status: "manual", detail: a.detail });
        continue;
      }
      try {
        const detail = await a.fix();
        results.push({ id: a.id, title: a.title, status: "ok", detail });
      } catch (e) {
        results.push({ id: a.id, title: a.title, status: "error", detail: e.message });
      }
    }
  } else {
    for (const a of actions) {
      results.push({ id: a.id, title: a.title, status: "plan", detail: a.detail });
    }
  }

  let recheck = null;
  if (APPLY) {
    const r = await check.run(process.execPath, [path.join(BOOST, "scripts", "oc-check.js"), "--json"], 30000);
    try { recheck = JSON.parse(r.out); } catch {}
  }

  const report = {
    date: check.today(),
    mode: APPLY ? "apply" : "plan",
    backupRoot: backupRoot(),
    actions: results,
    recheck,
  };
  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(report, null, 2));
    return;
  }
  printReport(report);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}

module.exports = { slug, parseFrontmatter, replaceTokens, skillFixes, writeText, backupFile, buildActions, main };
