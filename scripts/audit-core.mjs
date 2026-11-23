// Ядро аудита репозиториев: только чтение, без изменений проверяемой папки.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const SKIP_DIRS = new Set([
  ".git", "node_modules", "dist", "build", "coverage", ".next", "out",
  ".cache", ".turbo", "venv", ".venv", "__pycache__", "graphs",
]);
const TEXT_EXT = new Set([".md", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".css", ".html", ".json", ".yml", ".yaml", ".sql", ".sh", ".cmd"]);
const GIT = process.env.OPENCODE_GIT || path.join("C:\\Program Files", "Git", "cmd", "git.exe");

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function safeGit(root, args) {
  try {
    return execFileSync(GIT, ["-C", root, ...args], {
      encoding: "utf8", timeout: 15000, windowsHide: true, stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function walk(root, maxFiles = 2000) {
  const files = [];
  function visit(dir) {
    if (files.length >= maxFiles) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (files.length >= maxFiles) break;
      if (e.name.startsWith(".") && e.isDirectory() && e.name !== ".github") continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) visit(full);
      } else if (e.isFile()) {
        const stat = fs.statSync(full);
        files.push({ full, rel: path.relative(root, full).replace(/\\/g, "/"), ext: path.extname(e.name).toLowerCase(), size: stat.size });
      }
    }
  }
  visit(root);
  return files;
}

function readText(file, max = 200000) {
  try {
    const buf = fs.readFileSync(file);
    return buf.length > max ? buf.slice(0, max).toString("utf8") : buf.toString("utf8");
  } catch {
    return "";
  }
}

export function auditRepo(directory, options = {}) {
  const root = path.resolve(String(directory || ""));
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`Папка не найдена: ${root}`);
  }
  const name = options.name || path.basename(root).replace(/[^a-zA-Z0-9_-]/g, "_") || "repo";
  const files = walk(root, options.maxFiles || 2000);
  const byExt = {};
  let bytes = 0;
  for (const f of files) {
    bytes += f.size;
    const key = f.ext || "(без расширения)";
    byExt[key] = (byExt[key] || 0) + 1;
  }

  const has = (p) => fs.existsSync(path.join(root, p));
  const markers = {
    README: has("README.md") || has("README.rst") || has("readme.md"),
    AGENTS: has("AGENTS.md"),
    docs: has("docs"),
    wiki: has("wiki"),
    tests: has("test") || has("tests") || has("__tests__"),
    ci: has(".github/workflows"),
    package: has("package.json"),
    lock: has("package-lock.json") || has("pnpm-lock.yaml") || has("yarn.lock"),
    tsconfig: has("tsconfig.json"),
    envExample: has(".env.example") || has(".env.sample"),
    docker: has("Dockerfile") || has("docker-compose.yml") || has("compose.yml"),
    k8s: has("k8s"),
    license: has("LICENSE") || has("LICENSE.md"),
    gitignore: has(".gitignore"),
  };

  let pkg = null;
  if (markers.package) {
    try {
      const raw = JSON.parse(readText(path.join(root, "package.json")));
      pkg = {
        name: raw.name || "",
        version: raw.version || "",
        scripts: Object.keys(raw.scripts || {}),
        deps: Object.keys(raw.dependencies || {}).length,
        devDeps: Object.keys(raw.devDependencies || {}).length,
        workspaces: Array.isArray(raw.workspaces) ? raw.workspaces.length : 0,
      };
    } catch (e) {
      pkg = { error: e.message };
    }
  }

  let heading = "";
  if (markers.readme !== undefined || has("README.md")) {
    const text = readText(path.join(root, "README.md"));
    heading = (text.match(/^#\s+(.+)$/m) || [])[1] || "";
  }

  let todos = 0;
  const secretHits = [];
  const secretRx = /(api[_-]?key|token|secret|password)\s*[:=]\s*["'`][^"'`\n]{8,}["'`]/gi;
  const skRx = /sk-[A-Za-z0-9_-]{20,}/g;
  const scanned = files.filter((f) => TEXT_EXT.has(f.ext)).slice(0, 800);
  for (const f of scanned) {
    const text = readText(f.full);
    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (/\b(TODO|FIXME|HACK|XXX)\b/.test(line)) todos++;
      secretRx.lastIndex = 0;
      skRx.lastIndex = 0;
      if ((secretRx.test(line) || skRx.test(line)) && secretHits.length < 10) {
        secretHits.push(`${f.rel}:${i + 1} (значение скрыто)`);
      }
    });
  }

  const git = {
    branch: safeGit(root, ["rev-parse", "--abbrev-ref", "HEAD"]),
    remote: safeGit(root, ["remote", "get-url", "origin"]),
    lastCommit: safeGit(root, ["log", "-1", "--pretty=format:%h %s"]),
    dirty: safeGit(root, ["status", "--porcelain"]).split(/\r?\n/).filter(Boolean).length,
  };

  return {
    date: today(),
    name,
    root,
    files: files.length,
    bytes,
    byExt,
    markers,
    pkg,
    heading,
    todos,
    secretHits,
    scannedFiles: scanned.length,
    git,
  };
}

export function renderReport(a) {
  const yes = (v) => (v ? "да" : "нет");
  const topExt = Object.entries(a.byExt).sort((x, y) => y[1] - x[1]).slice(0, 12)
    .map(([k, v]) => `| ${k} | ${v} |`).join("\n");
  const lines = [
    `# Аудит репозитория ${a.name} — ${a.date}`,
    "",
    `- Путь: \`${a.root}\``,
    `- Заголовок README: ${a.heading || "—"}`,
    `- Файлов: ${a.files} · размер: ${(a.bytes / 1024 / 1024).toFixed(2)} МБ · просканировано текстовых: ${a.scannedFiles}`,
    "",
    "## Git",
    "",
    `- Ветка: ${a.git.branch || "—"}`,
    `- Origin: ${a.git.remote || "—"}`,
    `- Последний коммит: ${a.git.lastCommit || "—"}`,
    `- Изменений в рабочем дереве: ${a.git.dirty}`,
    "",
    "## Структура",
    "",
    "| Признак | Есть |",
    "| --- | --- |",
    ...Object.entries(a.markers).map(([k, v]) => `| ${k} | ${yes(v)} |`),
    "",
    "## Расширения файлов",
    "",
    "| Расширение | Файлов |",
    "| --- | --- |",
    topExt || "| — | 0 |",
    "",
    "## Пакет",
    "",
    a.pkg ? [
      `- Имя: ${a.pkg.name || "—"}`,
      `- Версия: ${a.pkg.version || "—"}`,
      `- Зависимостей: ${a.pkg.deps ?? "—"} · dev: ${a.pkg.devDeps ?? "—"} · workspaces: ${a.pkg.workspaces ?? "—"}`,
      `- Скрипты: ${(a.pkg.scripts || []).join(", ") || "—"}`,
    ].join("\n") : "package.json не найден",
    "",
    "## Риски и заметки",
    "",
    `- Маркеров TODO/FIXME/HACK/XXX: ${a.todos}`,
    `- Возможных секретов в тексте: ${a.secretHits.length}`,
    ...a.secretHits.map((h) => `  - ${h}`),
    a.secretHits.length ? "\n> Значения секретов намеренно не сохраняются." : "",
    "",
  ];
  return lines.join("\n");
}

export function saveReport(a, brainDir) {
  const dir = path.join(brainDir || path.join(process.env.USERPROFILE || "", "Desktop", "opencode-boost", "brain"), "reports");
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `repo-audit-${a.name}-${a.date}.md`);
  fs.writeFileSync(out, renderReport(a), "utf8");
  return out;
}
