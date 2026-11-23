#!/usr/bin/env node
// Подготовка релиза DevKit: проверка semver, VERSION, CHANGELOG и заметок релиза.
// Без внешних зависимостей. Вызывается как: node scripts/release.js prepare 1.1.0 [--dry-run]
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const VERSION_FILE = path.join(ROOT, "VERSION");
const CHANGELOG = path.join(ROOT, "CHANGELOG.md");
const NOTES = path.join(ROOT, "release-notes.md");
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function normalize(input) {
  return String(input || "").trim().replace(/^v/i, "");
}

function coreParts(version) {
  return version.split(/[-+]/)[0].split(".").map(Number);
}

function compare(a, b) {
  const left = coreParts(a);
  const right = coreParts(b);
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  const preA = a.includes("-");
  const preB = b.includes("-");
  if (preA && !preB) return -1;
  if (!preA && preB) return 1;
  return 0;
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function lastTag() {
  try {
    return git(["describe", "--tags", "--abbrev=0"]);
  } catch {
    return "";
  }
}

function logLines(tag) {
  const range = tag ? `${tag}..HEAD` : "HEAD";
  const out = git(["log", range, "--date=short", "--pretty=format:- %s (%h, %ad)"]);
  return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

function makeNotes(version, lines) {
  const date = new Date().toISOString().slice(0, 10);
  const body = lines.length ? lines.join("\n") : "- Начальный выпуск";
  return `## v${version} (${date})\n\n${body}\n`;
}

function updateChangelog(notes) {
  let text = fs.existsSync(CHANGELOG)
    ? fs.readFileSync(CHANGELOG, "utf8")
    : "# Changelog\n\nВсе значимые изменения фиксируются здесь.\n\n";
  const marker = "## Unreleased";
  const pos = text.indexOf(marker);
  if (pos >= 0) {
    text = `${text.slice(0, pos)}${notes}\n${text.slice(pos)}`;
  } else {
    text = text.replace(/(# Changelog\s*\n)/, `$1\n${notes}\n`);
  }
  fs.writeFileSync(CHANGELOG, text);
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] !== "prepare" || !args[1]) {
    console.error("Использование: node scripts/release.js prepare <версия> [--dry-run]");
    process.exitCode = 1;
    return;
  }

  const version = normalize(args[1]);
  if (!SEMVER.test(version)) {
    console.error(`Некорректная версия: ${JSON.stringify(args[1])}`);
    process.exitCode = 1;
    return;
  }

  const current = fs.readFileSync(VERSION_FILE, "utf8").trim();
  if (compare(version, current) <= 0) {
    console.error(`Новая версия ${version} должна быть больше текущей ${current}`);
    process.exitCode = 1;
    return;
  }

  const tag = lastTag();
  const notes = makeNotes(version, logLines(tag));

  if (args.includes("--dry-run")) {
    console.log(`Текущая версия: ${current}\nПредыдущий тег: ${tag || "нет"}\n\n${notes}`);
    return;
  }

  fs.writeFileSync(VERSION_FILE, `${version}\n`);
  updateChangelog(notes);
  fs.writeFileSync(NOTES, notes);
  console.log(`Подготовлен релиз v${version}. Предыдущий тег: ${tag || "нет"}`);
}

main();
