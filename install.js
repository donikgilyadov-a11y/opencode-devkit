#!/usr/bin/env node
// Установщик OpenCode DevKit. Без внешних зависимостей.
// Копирует плагины/навыки/команды/агентов, админку и скрипты, аккуратно merging
// конфиг OpenCode (сохраняя чужие настройки и делая резервную копию).

const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = __dirname;
const HOME = os.homedir();
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes(name);

const BOOST = arg("--boost", process.env.OPENCODE_BOOST_DIR || path.join(HOME, "Desktop", "opencode-boost"));
const CONFIG = arg("--config", path.join(HOME, ".config", "opencode"));
const NO_CONFIG = has("--no-config");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

function parseJsoncText(text) {
  text = text.replace(/^\uFEFF/, "");
  let out = "";
  let inString = false;
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (inString) {
      out += c;
      if (quoted) quoted = false;
      else if (c === "\\") quoted = true;
      else if (c === '"') inString = false;
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
  return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1"));
}

function readJsonc(file) {
  return parseJsoncText(fs.readFileSync(file, "utf8"));
}

function copyDir(from, to, patch) {
  if (!fs.existsSync(from)) return 0;
  fs.mkdirSync(to, { recursive: true });
  let n = 0;
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) {
      n += copyDir(src, dst, patch);
    } else {
      if (fs.existsSync(dst)) {
        const backup = `${dst}.bak-${stamp}`;
        fs.copyFileSync(dst, backup);
      }
      fs.copyFileSync(src, dst);
      if (patch && /\.(md|html|js|mjs|json|jsonc|cmd|txt)$/i.test(dst)) {
        let text = fs.readFileSync(dst, "utf8");
        const escapedHome = HOME.replace(/\\/g, "\\\\");
        const slashHome = HOME.replace(/\\/g, "/");
        text = text
          .replace(/%USERPROFILE%/g, /\.(js|mjs)$/i.test(dst) ? escapedHome : HOME)
          .replace(/<HOME>/g, /\.(js|mjs)$/i.test(dst) ? escapedHome : slashHome);
        fs.writeFileSync(dst, text);
      }
      n++;
    }
  }
  return n;
}

function mergeArrays(dst, src) {
  return Array.from(new Set([...(Array.isArray(dst) ? dst : []), ...src]));
}

function mergeConfig(existing, template) {
  const out = { ...existing };
  for (const key of ["instructions", "skills", "plugins"]) {
    out[key] = mergeArrays(out[key], template[key] || []);
  }
  out.references = { ...(out.references || {}), ...(template.references || {}) };
  out.mcp = out.mcp || {};
  out.mcp.servers = { ...(out.mcp.servers || {}), ...((template.mcp && template.mcp.servers) || {}) };
  if (Array.isArray(out.permissions)) {
    const seen = new Set(out.permissions.map((p) => JSON.stringify(p)));
    for (const p of template.permissions || []) {
      const k = JSON.stringify(p);
      if (!seen.has(k)) { out.permissions.push(p); seen.add(k); }
    }
  } else {
    out.permissions = template.permissions || [];
  }
  for (const key of Object.keys(template)) {
    if (!(key in out)) out[key] = template[key];
  }
  return out;
}

function main() {
  console.log(`Домашняя папка: ${HOME}`);
  console.log(`Каталог boost:  ${BOOST}`);
  console.log(`Каталог конфига:${CONFIG}`);

  const parts = [
    ["plugins", path.join(CONFIG, "plugins")],
    ["commands", path.join(CONFIG, "commands")],
    ["agents", path.join(CONFIG, "agents")],
    ["skills", path.join(BOOST, "skills")],
    ["scripts", path.join(BOOST, "scripts")],
    ["admin", path.join(BOOST, "admin")],
    ["brain-template", path.join(BOOST, "brain")],
  ];
  let total = 0;
  for (const [name, target] of parts) {
    const n = copyDir(path.join(ROOT, name), target, true);
    console.log(`  ${name}: ${n} файл(ов) -> ${target}`);
    total += n;
  }

  const instrSrc = path.join(ROOT, "config-examples", "INSTRUCTIONS.md.example");
  if (fs.existsSync(instrSrc)) {
    fs.mkdirSync(BOOST, { recursive: true });
    const dst = path.join(BOOST, "INSTRUCTIONS.md");
    if (fs.existsSync(dst)) fs.copyFileSync(dst, `${dst}.bak-${stamp}`);
    fs.copyFileSync(instrSrc, dst);
    console.log(`  INSTRUCTIONS.md -> ${dst}`);
  }

  if (!NO_CONFIG) {
    fs.mkdirSync(CONFIG, { recursive: true });
    const cfgPath = path.join(CONFIG, "opencode.jsonc");
    const rawTemplate = fs.readFileSync(path.join(ROOT, "config-examples", "opencode.jsonc.example"), "utf8")
      .replace(/<HOME>/g, HOME.replace(/\\/g, "/"));
    const templateParsed = parseJsoncText(rawTemplate);
    let existing = {};
    if (fs.existsSync(cfgPath)) {
      existing = readJsonc(cfgPath);
      if (existing.__error) {
        throw new Error(`Не удалось разобрать ${cfgPath}: ${existing.__error}. Исправьте вручную или используйте --no-config.`);
      }
      fs.copyFileSync(cfgPath, `${cfgPath}.bak-${stamp}`);
      console.log(`  Резервная копия конфига: ${cfgPath}.bak-${stamp}`);
    }
    const merged = mergeConfig(existing, templateParsed);
    fs.writeFileSync(cfgPath, JSON.stringify(merged, null, 2) + "\n");
    console.log(`  Конфиг обновлён: ${cfgPath}`);

    for (const name of ["cli.json", "opencode-notifier.json", "ponytail-scoped.json", "dcp.jsonc"]) {
      const src = path.join(ROOT, "config-examples", name + ".example");
      const dst = path.join(CONFIG, name);
      if (fs.existsSync(src) && !fs.existsSync(dst)) {
        fs.copyFileSync(src, dst);
        console.log(`  ${name} -> ${dst}`);
      }
    }
  }

  console.log(`\nГотово: скопировано ${total} файл(ов).`);
  console.log("Пакетные плагины ставятся отдельно: opencode plugin add <package>");
  console.log("Дополнительно: Node.js, опционально Obsidian + Local REST API и прокси из scripts/.");
  console.log("Перезапускать сервис OpenCode не нужно — конфиг подхватывается автоматически.");
}

try { main(); } catch (e) { console.error("ОШИБКА:", e.message); process.exitCode = 1; }
