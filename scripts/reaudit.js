#!/usr/bin/env node
// Повторяемый read-only re-audit: node reaudit.js <папка> [--name имя] [--json] [--no-save] [--refresh-baseline]
// Сравнивает текущее состояние с базовым отчётом и пишет результат в brain/reports/.
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("node:url");

const BRAIN = process.env.OPENCODE_BRAIN || path.join(__dirname, "..", "brain");
const HOME = process.env.USERPROFILE || process.env.HOME || "";
const SKIP_DIRS = new Set([
  ".git", "node_modules", "dist", "build", "coverage", ".next", "out",
  ".cache", ".turbo", "venv", ".venv", "__pycache__", "graphs", ".obsidian",
]);

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function redact(line) {
  let out = String(line || "");
  out = out.replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*["'`][^"'`\n]{4,}["'`]/gi, "$1=[REDACTED]");
  out = out.replace(/(gh[pousr]_[A-Za-z0-9]{8,}|sk-[A-Za-z0-9_-]{8,})/g, "[REDACTED]");
  if (HOME) out = out.split(HOME).join("%USERPROFILE%");
  return out.replace(/\s+/g, " ").trim().slice(0, 180);
}

function readText(file, max = 500000) {
  try {
    const buf = fs.readFileSync(file);
    return buf.length > max ? buf.slice(0, max).toString("utf8") : buf.toString("utf8");
  } catch {
    return "";
  }
}

function buildIndex(root) {
  const index = new Map();
  function visit(dir, depth) {
    if (depth > 14) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const rel = path.relative(root, full).replace(/\\/g, "/");
      if (e.isDirectory()) {
        if (e.name.startsWith(".") && e.name !== ".github") continue;
        if (SKIP_DIRS.has(e.name)) continue;
        visit(full, depth + 1);
      } else if (e.isFile()) {
        const base = path.basename(e.name);
        if (!index.has(base)) index.set(base, []);
        index.get(base).push(rel);
      }
    }
  }
  visit(root, 0);
  return index;
}

function resolveFile(root, index, ref) {
  const clean = String(ref).replace(/\\/g, "/");
  const direct = path.join(root, clean);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;
  const hits = index.get(path.basename(clean)) || [];
  if (hits.length) return path.join(root, hits[0]);
  return null;
}

// Статические проверки. open — признак уязвимого кода, fixed — признак исправления.
// Для-check с window исправление ищется рядом с каждым совпадением open.
const CHECKS = [
  // P0 — периметр и безопасность
  { id: "P0-1", severity: "P0", title: "Permission middleware fail-open без agentId", files: ["permission-middleware.ts"], open: ["if\\s*\\(\\s*!\\s*ctx\\.agentId\\s*\\)\\s*return\\s*\\{\\s*kind:\\s*['\"]allow['\"]"], fixed: ["!ctx\\.agentId[^\\n]{0,120}deny", "default-deny", "system.*authz"], window: 3 },
  { id: "P0-2", severity: "P0", title: "Code-runner: произвольный node/npm/npx + полный env", files: ["server/code-runner-sidecar.mjs"], open: ["['\"]npx['\"]", "env:\\s*\\{\\s*\\.\\.\\.process\\.env"], fixed: ["env:\\s*\\{\\s*(PATH|CI)[^\\n]*\\}", "ALLOWED_SCRIPTS", "allowedScripts"], window: 6 },
  { id: "P0-3", severity: "P0", title: "Python browser-use sidecar: SSRF/loopback/RFC1918", files: ["docker/browser-use-sidecar/server.py"], open: ["loopback/RFC1918 разрешены", "dev-имена разрешены"], fixed: ["is_private", "is_loopback", "is_link_local", "dns\\.resolve", "redirect"], window: 8 },
  { id: "P0-4", severity: "P0", title: "HTTP REST gateway без tenant-scope", files: ["server/sync-server.mjs"], open: ["approvalDecideRoute\\s*=\\s*pathname\\.match", "companies/[^\\n]*export"], fixed: ["tenantScope", "requireCompany", "hasCompanyAccess", "assertCompany"], window: 8 },
  { id: "P0-5", severity: "P0", title: "Chat cross-tab lock fail-open", files: ["chat-send-message.ts"], open: ["!lockResult\\.lock", "lock.*fail"], fixed: ["failClosed", "lockRequired", "throw new Error\\(['\"]Chat lock"], window: 5 },
  { id: "P0-6", severity: "P0", title: "Нет fencing token в distributed lock", files: ["cross-tab-lock-service.ts"], open: ["ownerId"], fixed: ["fencingToken", "fencing_token"], window: 12 },
  { id: "P0-7", severity: "P0", title: "Governance/agent/crew мутации без authz", files: ["governance-service.ts", "agent-service.ts", "crew-service.ts"], open: ["grantCapability\\s*\\(", "assignRole\\s*\\(", "spawn\\s*\\("], fixed: ["callerId", "assertAuthz", "authorizationService\\.evaluate"], window: 10 },
  { id: "P0-8", severity: "P0", title: "AUTOPILOT без admin-гейта", files: ["agems-approval-service.ts"], open: ["AUTOPILOT"], fixed: ["requireAdmin\\s*\\(", "assertAdmin\\s*\\(", "hasRole\\([^\\n]*admin"], window: 10 },
  { id: "P0-9", severity: "P0", title: "Токены/секреты в localStorage", files: ["browser-use-service.ts", "sidecar-computer-executor.ts", "config-registry.ts"], open: ["localStorage[\\s\\S]{0,80}(token|secret)", "(token|secret)[\\s\\S]{0,80}localStorage"], fixed: ["HttpOnly", "sessionStorage", "SecureStore"], window: 6 },

  // P1 — надёжность и целостность
  { id: "P1-1", severity: "P1", title: "Clean-shutdown флаг не пишется в destroy()", files: ["database-service.ts"], open: ["CLEAN_SHUTDOWN_KEY|ai_os_clean_shutdown", "destroy\\s*\\("], fixed: ["setItem\\([^\\n]*(CLEAN_SHUTDOWN_KEY|ai_os_clean_shutdown)"], window: 18 },
  { id: "P1-2", severity: "P1", title: "Два DLQ не связаны /EventBus → IDeadLetterQueue/", files: ["event-bus.ts", "dead-letter-queue-service.ts"], open: ["pushDeadLetter", "drainDeadLetterQueue"], fixed: ["IDeadLetterQueue\\.push", "deadLetterService\\.push", "deadLetterQueueService\\.push"], window: 12 },
  { id: "P1-3", severity: "P1", title: "WAL EventRecorder без проверки checksum", files: ["event-recorder.ts"], open: ["event-recorder:wal", "this\\.events\\.push\\(ev\\)"], fixed: ["verifyChecksum", "boundedChecksum"], window: 18 },
  { id: "P1-4", severity: "P1", title: "EventBus backpressure эмитит событие реентрантно", files: ["event-bus.ts"], open: ["this\\.emit\\(EVENTS\\.EVENTBUS_BACKPRESSURE"], fixed: ["_backpressureEmitting", "noEmit", "backpressureGuard"], window: 8 },
  { id: "P1-5", severity: "P1", title: "CacheService pendingSet не очищается /perpetual stale/", files: ["cache-service.ts"], open: ["pendingSet\\.add", "wasExplicitlySet"], fixed: ["pendingSet\\.delete[^\\n]{0,200}(invalidate|evict|set)"], window: 12 },
  { id: "P1-6", severity: "P1", title: "BatchProcessor: parallel runJob + timeout без abort", files: ["batch-processor-service.ts"], open: ["currentAbort", "Promise\\.race"], fixed: ["Map<[^>]*AbortController", "abortController\\.abort", "runningJob"], window: 10 },
  { id: "P1-7", severity: "P1", title: "_initialized = true до await в init()", files: ["key-service.ts", "config-service.ts", "settings-service.ts"], open: ["_initialized\\s*=\\s*true"], fixed: ["initPromise", "_initPromise", "_initialized\\s*=\\s*true[^\\n]{0,120}await"], window: 12 },
  { id: "P1-8", severity: "P1", title: "Zod-хуки покрывают только ~23 из 131 таблицы", files: ["schema-hooks.ts", "dexie-schema.ts"], open: ["schemaHooks", "z\\.object\\(\\{"], fixed: ["ALL_TABLES", "applyToAllTables", "registerAllHooks", "ZOD_HOOKS_FOR_ALL_TABLES"], window: 40 },
  { id: "P1-9", severity: "P1", title: "Hard-stop бюджета in-memory и сбрасывается", files: ["cost-manager.ts"], open: ["NO server persistence", "records\\s*=\\s*\\[\\]"], fixed: ["saveCostRecords", "costHistory", "persistRecords"], window: 14 },
  { id: "P1-10", severity: "P1", title: "SnapshotService.startReplay портит живое состояние", files: ["snapshot-service.ts"], open: ["startReplay\\s*\\(", "kernel\\.loadState"], fixed: ["saveStateBeforeReplay", "try\\s*\\{[\\s\\S]{0,400}finally", "restoreLiveState"], window: 24 },
  { id: "P1-11", severity: "P1", title: "Per-tab rate-limit бакеты", files: ["rate-limit-decorator.ts"], open: ["#global", "#perProvider"], fixed: ["getKvCas", "sharedBucket", "crossTabBucket"], window: 14 },
  { id: "P1-12", severity: "P1", title: "Groq обходит LLM-стек через SDK", files: ["groq-adapter.ts"], open: ["groq-sdk", "dangerouslyAllowBrowser"], fixed: ["LLMHttpClient", "RateLimitDecorator", "CircuitBreaker"], window: 20 },

  // P2 — качество/документация/периферия
  { id: "P2-1", severity: "P2", title: "SSE без Last-Event-ID/resume", files: ["sync-server.mjs"], open: ["text/event-stream"], fixed: ["Last-Event-ID", "last-event-id", "event:\\s*"], window: 20 },
  { id: "P2-2", severity: "P2", title: "clearAllData чистит только 16/131 таблиц", files: ["key-service.ts"], open: ["clearAllData"], fixed: ["db\\.tables\\.forEach", "for\\s*\\(const table of db\\.tables"], window: 16 },
  { id: "P2-3", severity: "P2", title: "Unhandled promise в memory worker", files: ["memory.worker.ts"], open: ["void\\s+oramaRemove", "onunhandledrejection"], fixed: ["catch\\(LOGGER", "postMessage\\([^\\n]*error"], window: 10 },
];

function toRegExp(source, flags = "") {
  return new RegExp(source, flags.includes("g") ? flags : flags + "g");
}

function findMatches(lines, source, windowSize) {
  const rx = toRegExp(source);
  const out = [];
  lines.forEach((line, i) => {
    rx.lastIndex = 0;
    if (!rx.test(line)) return;
    const from = windowSize ? Math.max(0, i - windowSize) : i;
    const to = windowSize ? Math.min(lines.length - 1, i + windowSize) : i;
    const near = lines.slice(from, to + 1).join("\n");
    out.push({ line: i + 1, text: redact(line), near });
  });
  return out;
}

function evaluateCheck(check, root, index) {
  if (check.manual) return { ...check, status: "manual", evidence: ["Требуется ручная проверка"] };
  const resolved = [];
  for (const ref of check.files || []) {
    const file = resolveFile(root, index, ref);
    if (file) resolved.push({ ref, file, text: readText(file), lines: readText(file).split(/\r?\n/) });
  }
  if (!resolved.length) return { ...check, status: "missing", evidence: [`Файлы не найдены: ${(check.files || []).join(", ")}`] };

  const openHits = [];
  const fixedHits = [];
  for (const item of resolved) {
    for (const source of check.open || []) {
      for (const hit of findMatches(item.lines, source, check.window || 0)) {
        openHits.push({ file: item.ref, ...hit });
      }
    }
    for (const source of check.fixed || []) {
      for (const hit of findMatches(item.lines, source, 0)) {
        fixedHits.push({ file: item.ref, ...hit });
      }
    }
  }

  let status;
  if (check.window) {
    const fixedRx = (check.fixed || []).map((source) => toRegExp(source));
    const nearFixed = (h) => fixedRx.some((rx) => { rx.lastIndex = 0; return rx.test(h.near); });
    const covered = openHits.length > 0 && openHits.every(nearFixed);
    const anyCovered = openHits.some(nearFixed);
    status = openHits.length === 0 ? (fixedHits.length > 0 ? "fixed" : "uncertain")
      : covered ? "fixed"
      : anyCovered ? "mixed"
      : "open";
  } else {
    status = openHits.length === 0 && fixedHits.length > 0 ? "fixed"
      : openHits.length > 0 && fixedHits.length === 0 ? "open"
      : openHits.length > 0 && fixedHits.length > 0 ? "mixed"
      : "uncertain";
  }

  const evidence = [];
  for (const h of openHits.slice(0, 2)) evidence.push(`OPEN ${h.file}:${h.line}: ${h.text}`);
  for (const h of fixedHits.slice(0, 2)) evidence.push(`FIX  ${h.file}:${h.line}: ${h.text}`);
  if (!evidence.length) evidence.push("Совпадений не найдено — нужен ручной осмотр");
  return { ...check, status, evidence };
}

async function gitInfo(root) {
  try {
    const core = await import(pathToFileURL(path.join(__dirname, "audit-core.mjs")).href);
    const a = core.auditRepo(root, { maxFiles: 300 });
    return a.git;
  } catch {
    return {};
  }
}

function baselinePath(name, explicit) {
  if (explicit) return path.resolve(explicit);
  return path.join(BRAIN, "reports", `reaudit-baseline-${name}.json`);
}

function makeBaseline(results, root) {
  return {
    date: today(),
    root,
    checks: results.map((r) => ({ id: r.id, status: r.status, severity: r.severity, title: r.title })),
  };
}

function diffBaseline(results, baseline) {
  const was = new Map((baseline.checks || []).map((c) => [c.id, c.status]));
  const closed = [];
  const regressed = [];
  const remaining = [];
  for (const r of results) {
    const prev = was.get(r.id);
    if (prev === undefined) continue;
    if (prev !== "fixed" && r.status === "fixed") closed.push(r);
    else if (prev === "fixed" && r.status !== "fixed") regressed.push(r);
    else if (prev !== "fixed" && r.status !== "fixed") remaining.push(r);
  }
  return { closed, regressed, remaining };
}

function renderReport(res) {
  const s = res.summary;
  const lines = [
    `# Re-audit ${res.name} — ${res.date}`,
    "",
    `- Путь: \`${res.root}\``,
    `- Git: ${[res.git.branch, res.git.lastCommit].filter(Boolean).join(" · ") || "—"}`,
    `- Проверок: ${s.total} · исправлено: ${s.fixed} · открыто: ${s.open} · смешано: ${s.mixed} · неясно: ${s.uncertain + s.missing + s.manual}`,
    `- Закрыто относительно базы: ${res.diff.closed.length} · регрессов: ${res.diff.regressed.length} · осталось не закрытых: ${res.diff.remaining.length}`,
    res.baselineCreated ? `- База создана заново: \`${res.baseline}\`` : `- База: \`${res.baseline}\``,
    "",
    "## Динамика относительно базы",
    "",
    "### Закрыто",
    res.diff.closed.length ? res.diff.closed.map((r) => `- ${r.id} [${r.severity}] ${r.title} — было \`${(res.baseline.checks.find((c) => c.id === r.id) || {}).status}\`, стало \`fixed\``).join("\n") : "- Nothing",
    "",
    "### Регрессы",
    res.diff.regressed.length ? res.diff.regressed.map((r) => `- ${r.id} [${r.severity}] ${r.title} — было \`fixed\`, стало \`${r.status}\``).join("\n") : "- Нет",
    "",
    "### Осталось открытым",
    res.diff.remaining.length ? res.diff.remaining.map((r) => `- ${r.id} [${r.severity}] ${r.title}`).join("\n") : "- Нет",
    "",
    "## Статус проверок",
    "",
    "| Статус | Приоритет | ID | Проверка | Свидетельство |",
    "| --- | --- | --- | --- | --- |",
    ...res.results.map((r) => `| ${r.status} | ${r.severity} | ${r.id} | ${r.title} | ${r.evidence.slice(0, 1).join(" ").replace(/\|/g, "\\|")} |`),
    "",
    "## Ограничения",
    "",
    "- Это статическая проверка по регулярным выражениям и присутствию файлов. Она не запускает проект, не выполняет тесты и не доказывает отсутствие уязвимости.",
    "- Статус `mixed`/`uncertain`/`missing` означает, что код переписан или файл переименован — нужен ручной осмотр.",
    "- Проверки `manual` требуют чтения кода; новые виды дефектов автоматически не обнаруживаются.",
    "- Секреты в отчёт не копируются: значения заменяются на `[REDACTED]`.",
    "",
    "## Связанные отчёты",
    "",
    "- `brain/reports/ai-os-new-deep-audit.md` — 45 находок, приоритеты P0–P2.",
    "- `brain/reports/ai-os-new-matrix-audit.md` — 39 классов матрицы, топ-10 и коррекции шпаргалки.",
    "- `brain/reports/ai-os-new-security-debt.md`, `ai-os-new-debates.md`.",
    "",
  ];
  return lines.join("\n");
}

function saveReport(res) {
  const dir = path.join(BRAIN, "reports");
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `ai-os-new-reaudit-${res.date}.md`);
  fs.writeFileSync(out, renderReport(res), "utf8");
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args[0].startsWith("--")) {
    console.error("Использование: reaudit.js <папка> [--name имя] [--json] [--no-save] [--refresh-baseline] [--baseline путь]");
    process.exit(1);
  }
  const root = path.resolve(args[0]);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error(`Папка не найдена: ${root}`);
  const opts = {
    json: args.includes("--json"),
    save: !args.includes("--no-save"),
    refresh: args.includes("--refresh-baseline"),
    name: undefined, baseline: undefined,
  };
  const ni = args.indexOf("--name"); if (ni >= 0 && args[ni + 1]) opts.name = args[ni + 1];
  const bi = args.indexOf("--baseline"); if (bi >= 0 && args[bi + 1]) opts.baseline = args[bi + 1];
  const name = opts.name || path.basename(root).replace(/[^a-zA-Z0-9_-]/g, "_") || "repo";

  const index = buildIndex(root);
  const results = CHECKS.map((c) => evaluateCheck(c, root, index));
  const summary = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    acc.total++;
    return acc;
  }, { total: 0, fixed: 0, open: 0, mixed: 0, uncertain: 0, missing: 0, manual: 0 });

  const git = await gitInfo(root);
  const bp = baselinePath(name, opts.baseline);
  let baselineCreated = false;
  let baseline;
  if (opts.refresh || !fs.existsSync(bp)) {
    baseline = makeBaseline(results, root);
    fs.mkdirSync(path.dirname(bp), { recursive: true });
    fs.writeFileSync(bp, JSON.stringify(baseline, null, 2), "utf8");
    baselineCreated = true;
  } else {
    try { baseline = JSON.parse(fs.readFileSync(bp, "utf8")); }
    catch { baseline = makeBaseline(results, root); baselineCreated = true; }
  }

  const res = {
    date: today(), name, root, git, results, summary, baseline: bp, baselineCreated,
    diff: diffBaseline(results, baseline),
  };
  if (opts.save && !opts.json) {
    const out = saveReport(res);
    console.log(`\nОтчёт: ${out}`);
  }
  if (opts.json) process.stdout.write(JSON.stringify(res, null, 2));
  else console.log(renderReport(res));
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
}

module.exports = {
  CHECKS, redact, buildIndex, resolveFile, evaluateCheck,
  makeBaseline, diffBaseline, renderReport, saveReport, main,
};
