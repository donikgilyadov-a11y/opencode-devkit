// Аудит логов сессий OpenCode: повторяющиеся ошибки, циклы и перезапуски CLI.
// Только чтение логов; отчёты пишутся в brain/reports/.
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const HOME = process.env.USERPROFILE || process.env.HOME || "";
const DEFAULT_LOG = path.join(HOME, ".local", "share", "opencode", "log", "opencode.log");
const DEFAULT_BRAIN = path.join(HOME, "Desktop", "opencode-boost", "brain");
const KV = /([A-Za-z][\w.]*)=("(?:[^"\\]|\\.)*"|\S+)/g;

function redact(value) {
  let s = String(value == null ? "" : value);
  if (HOME) {
    const escaped = HOME.replace(/\\/g, "\\\\");
    s = s.split(escaped).join("%USERPROFILE%").split(HOME).join("%USERPROFILE%");
    const fwd = HOME.replace(/\\/g, "/");
    s = s.split(fwd).join("%USERPROFILE%");
  }
  return s
    .replace(/gh[pousr]_[A-Za-z0-9]{20,}/g, "[TOKEN]")
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "[KEY]")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/\b ses_[a-zA-Z0-9]+/g, " ses_<id>")
    .replace(/\bmsg_[a-zA-Z0-9]+/g, "msg_<id>")
    .slice(0, 320);
}

function parseLine(line) {
  if (!line || !line.trim()) return null;
  const fields = {};
  for (const m of String(line).matchAll(KV)) {
    let v = m[2];
    if (v.startsWith('"') && v.endsWith('"')) {
      v = v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
    fields[m[1]] = v;
  }
  if (!fields.message && !fields.level) return null;
  const ts = Date.parse(fields.timestamp || "");
  return {
    time: fields.timestamp || "",
    ts: Number.isFinite(ts) ? ts : 0,
    level: String(fields.level || "INFO").toUpperCase(),
    run: fields.run || "",
    session: fields["session.id"] || fields.sessionID || "",
    message: String(fields.message || ""),
    fields,
  };
}

function normalize(message) {
  return String(message || "")
    .replace(/\b(?:ses|msg)_[a-zA-Z0-9]+/g, "<id>")
    .replace(/\b[0-9a-f]{8,}\b/gi, "<hex>")
    .replace(/\d+(?:\.\d+)?/g, "#")
    .replace(/[A-Za-z]:[\\/][^\s"]+/g, "<path>")
    .replace(/https?:\/\/[^\s"]+/g, "<url>")
    .replace(/["'`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160) || "(пусто)";
}

const RULES = [
  { re: /worktree discovery failed|DirectoryUnavailableError/i,
    title: "Сессия открыта из отсутствующей папки",
    fix: "Проверять cwd сессии в oc-check и добавить auto-fix в oc-doctor (создать папку или переоткрыть сессию из существующей).",
    test: "doctor.test.js: кейс с несуществующим cwd; ожидаемый manual/auto action." },
  { re: /cli starting/i,
    title: "Перезапуски CLI",
    fix: "Группировать вызовы через Code Mode tools.execute и `opencode api`, меньше одиночных `opencode ...` из shell.",
    test: "smoke: сравнить число событий `cli starting` до/после пакетного прогона." },
  { re: /no longer supports free models|Update to the latest version/i,
    title: "Устаревший Desktop-клиент",
    fix: "Обновить OpenCode Desktop до актуальной версии 2.x.",
    test: "oc-check: проверка версии сервиса и клиента." },
  { re: /free usage limit|exceeded your current quota|check your plan/i,
    title: "Исчерпан лимит/квота",
    fix: "Перед долгой работой звать quota_status(), при лимите — autopilot.stop(reason: \"quota/budget\").",
    test: "Проверить, что сценарий автопилота останавливается при quota/budget." },
  { re: /Failed to fetch models\.dev|ENOTFOUND|TimeoutError/i,
    title: "Сетевой сбой при обновлении моделей",
    fix: "Не блокирующий: добавить кэш/ретрай с backoff, не падать при офлайне.",
    test: "Юнит-тест парсера на строку с TimeoutError + проверка, что статус сервиса остаётся ok." },
  { re: /mcp connect failed|mcp transport error|mcp http request failed/i,
    title: "MCP-сервер недоступен",
    fix: "Проверить мост Obsidian (порты 27125/27123), watchdog и Startup-ярлык через /api/obsidian и oc-check.",
    test: "smoke-admin.js: проверка /api/obsidian (proxy ok + autostart)." },
  { re: /mcp http authentication rejected/i,
    title: "Ошибка авторизации MCP",
    fix: "Проверить API-ключ Local REST API и заголовок Authorization; секрет хранить только в data.json, не в opencode.jsonc.",
    test: "Прямой POST /mcp/ с ключом из data.json должен возвращать 200." },
  { re: /permission|denied/i,
    title: "Отказ в разрешении",
    fix: "Проверить permissions в opencode.jsonc; не обходить запреты обходными путями.",
    test: "Проверка, что cc-safety-net и permissions дают предсказуемый отказ." },
];

function suggest(message) {
  for (const rule of RULES) if (rule.re.test(message || "")) return rule;
  return {
    title: "Неизвестный повторяющийся сигнал",
    fix: "Добавить нормализованное сообщение в правила аудита и точечный фикс в oc-doctor.",
    test: "Регрессионный тест в session-audit.test.js с этим сообщением.",
  };
}

function bucketByDay(items) {
  const out = {};
  for (const it of items) {
    const day = (it.time || "").slice(0, 10) || "без даты";
    out[day] = (out[day] || 0) + 1;
  }
  return out;
}

function analyze(text, options = {}) {
  const all = Boolean(options.all);
  const hours = options.hours == null ? 168 : Number(options.hours);
  const now = options.now == null ? Date.now() : Number(options.now);
  const minTs = all ? -Infinity : now - Math.max(1, hours) * 3600000;
  const lines = String(text || "").split(/\r?\n/);
  const parsed = [];
  for (const line of lines) {
    const rec = parseLine(line);
    if (!rec) continue;
    if (!all && rec.ts && rec.ts < minTs) continue;
    parsed.push(rec);
  }

  const levels = {};
  const messageMap = new Map();
  const sessions = new Map();
  const cli = [];

  for (const rec of parsed) {
    levels[rec.level] = (levels[rec.level] || 0) + 1;
    if (rec.message === "cli starting") cli.push(rec);
    if (rec.session) {
      const s = sessions.get(rec.session) || { id: rec.session, steps: 0, events: 0, first: rec.time, last: rec.time };
      const step = Number(rec.fields.step || 0);
      if (Number.isFinite(step)) s.steps = Math.max(s.steps, step);
      s.events++;
      s.last = rec.time || s.last;
      sessions.set(rec.session, s);
    }
    const noisy = /error|fail|retry|denied|timeout|abort|worktree discovery failed/i.test(rec.message + " " + (rec.fields.error || ""));
    if (rec.level !== "ERROR" && rec.level !== "WARN" && !noisy) continue;
    const key = normalize(rec.message);
    const p = messageMap.get(key) || {
      key, sample: rec.message,
      context: redact(rec.fields.error || rec.fields.cause || rec.fields["error.error"] || ""),
      count: 0, first: rec.time, last: rec.time,
      levels: {}, sessions: new Set(), runs: new Set(),
    };
    p.count++;
    p.levels[rec.level] = (p.levels[rec.level] || 0) + 1;
    if (rec.session) p.sessions.add(rec.session);
    if (rec.run) p.runs.add(rec.run);
    if (rec.time < p.first || !p.first) p.first = rec.time;
    if (rec.time > p.last) p.last = rec.time;
    messageMap.set(key, p);
  }

  const patterns = [...messageMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, options.limit || 20)
    .map((p) => {
      const rule = suggest(`${p.sample} ${p.context}`);
      return {
        message: redact(p.sample),
        context: p.context,
        normalized: p.key,
        count: p.count,
        first: p.first,
        last: p.last,
        levels: p.levels,
        sessions: p.sessions.size,
        runs: p.runs.size,
        title: rule.title,
        fix: rule.fix,
        test: rule.test,
      };
    });

  const loops = [];
  for (const [key, list] of messageMap.entries()) {
    if (list.count < 5) continue;
    const times = parsed
      .filter((r) => normalize(r.message) === key && r.ts)
      .map((r) => r.ts)
      .sort((a, b) => a - b);
    let best = 0;
    for (let i = 0; i < times.length; i++) {
      for (let j = i; j < times.length && times[j] - times[i] <= 120000; j++) {
        best = Math.max(best, j - i + 1);
      }
    }
    if (best >= 5) loops.push({ message: redact(list.sample), in2min: best, total: list.count });
  }
  loops.sort((a, b) => b.in2min - a.in2min);

  const sessionList = [...sessions.values()].sort((a, b) => b.steps - a.steps).slice(0, 10)
    .map((s) => ({ id: s.id, steps: s.steps, events: s.events, last: s.last }));

  const cliByDay = bucketByDay(cli);
  const cliByHour = {};
  for (const rec of cli) {
    const hour = (rec.time || "").slice(0, 13) || "без времени";
    cliByHour[hour] = (cliByHour[hour] || 0) + 1;
  }
  const peakHour = Object.entries(cliByHour).sort((a, b) => b[1] - a[1])[0] || ["—", 0];

  const recommendations = [];
  const seen = new Set();
  for (const p of patterns) {
    if (seen.has(p.title)) continue;
    seen.add(p.title);
    recommendations.push({ title: p.title, fix: p.fix, test: p.test, count: p.count });
  }
  if (cli.length >= 50) {
    recommendations.push({
      title: "Много коротких запусков CLI",
      fix: "Объединять диагностические команды в один прогон и использовать tools.execute / `opencode api`.",
      test: "Замер числа `cli starting` за прогон в smoke-тесте.",
      count: cli.length,
    });
  }

  return {
    generated: new Date().toISOString(),
    log: options.logPath || DEFAULT_LOG,
    all,
    hours: all ? null : hours,
    totalLines: lines.length,
    scanned: parsed.length,
    levels,
    cliStarts: cli.length,
    cliByDay,
    peakHour: { hour: peakHour[0], count: peakHour[1] },
    patterns,
    loops,
    sessions: sessionList,
    recommendations,
  };
}

function renderReport(a) {
  const lines = [];
  lines.push("# Аудит сессий OpenCode");
  lines.push("");
  lines.push(`- Сгенерировано: ${a.generated}`);
  lines.push(`- Лог: \`${a.log}\``);
  lines.push(`- Окно: ${a.all ? "весь лог" : `последние ${a.hours} ч`}; строк прочитано ${a.totalLines}, разобрано ${a.scanned}`);
  lines.push(`- Уровни: ${Object.entries(a.levels).map(([k, v]) => `${k} ${v}`).join(" · ") || "—"}`);
  lines.push(`- Запусков CLI: ${a.cliStarts}; пик: ${a.peakHour.hour} — ${a.peakHour.count}`);
  lines.push("");
  lines.push("## Повторяющиеся ошибки и предупреждения");
  lines.push("");
  if (!a.patterns.length) {
    lines.push("Нет сигналов за выбранный период.");
  } else {
    lines.push("| Сообщение | Кол-во | Уровни | Сессии | Первое | Последнее |");
    lines.push("|---|---:|---|---:|---|---|");
    for (const p of a.patterns) {
      lines.push(`| ${redact(p.message).replace(/\|/g, "\\|")} | ${p.count} | ${Object.keys(p.levels).join("/")} | ${p.sessions} | ${p.first} | ${p.last} |`);
    }
  }
  lines.push("");
  lines.push("## Циклы и всплески");
  lines.push("");
  if (!a.loops.length) lines.push("Всплесков >=5 одинаковых событий за 2 минуты не найдено.");
  else for (const l of a.loops) lines.push(`- **${l.in2min} за 2 мин** (всего ${l.total}): ${l.message}`);
  lines.push("");
  lines.push("## Сессии с наибольшим числом шагов");
  lines.push("");
  if (!a.sessions.length) lines.push("Нет данных.");
  else for (const s of a.sessions) lines.push(`- \`${s.id}\`: шагов ${s.steps}, событий ${s.events}, последнее ${s.last}`);
  lines.push("");
  lines.push("## Рекомендации: тесты, навыки, фиксы");
  lines.push("");
  if (!a.recommendations.length) lines.push("Пока ничего не найдено — повторите с `--all`.");
  else {
    let i = 1;
    for (const r of a.recommendations) {
      lines.push(`${i++}. **${r.title}** (${r.count})`);
      lines.push(`   - Фикс: ${r.fix}`);
      lines.push(`   - Тест: ${r.test}`);
    }
  }
  lines.push("");
  lines.push("## Запуски CLI по дням");
  lines.push("");
  for (const [day, n] of Object.entries(a.cliByDay).sort()) lines.push(`- ${day}: ${n}`);
  lines.push("");
  return lines.join("\n");
}

function saveReport(a, brainDir = DEFAULT_BRAIN) {
  const dir = path.join(brainDir, "reports");
  fs.mkdirSync(dir, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  const file = path.join(dir, `session-audit-${day}.md`);
  fs.writeFileSync(file, renderReport(a), "utf8");
  return file;
}

function parseArgs(argv) {
  const opts = { logPath: DEFAULT_LOG, brainDir: DEFAULT_BRAIN, hours: 168, all: false, save: false, json: false, limit: 20 };
  for (const arg of argv) {
    if (arg === "--all") opts.all = true;
    else if (arg === "--save") opts.save = true;
    else if (arg === "--json") opts.json = true;
    else if (arg.startsWith("--hours=")) opts.hours = Number(arg.split("=")[1]);
    else if (arg.startsWith("--log=")) opts.logPath = arg.slice(6);
    else if (arg.startsWith("--brain=")) opts.brainDir = arg.slice(8);
    else if (arg.startsWith("--limit=")) opts.limit = Number(arg.split("=")[1]);
  }
  return opts;
}

function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (!fs.existsSync(opts.logPath)) {
    console.error(`Лог не найден: ${opts.logPath}`);
    process.exitCode = 1;
    return null;
  }
  const a = analyze(fs.readFileSync(opts.logPath, "utf8"), { ...opts, logPath: opts.logPath });
  const report = opts.save ? saveReport(a, opts.brainDir) : null;
  if (opts.json) {
    console.log(JSON.stringify({ ...a, report }, null, 2));
  } else {
    console.log(renderReport(a));
    if (report) console.log(`\nОтчёт: ${report}`);
  }
  return a;
}

if (require.main === module) main();

module.exports = { parseLine, redact, normalize, analyze, renderReport, saveReport, parseArgs, main, RULES, DEFAULT_LOG };
