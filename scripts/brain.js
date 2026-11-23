#!/usr/bin/env node
// Второй мозг: save / find / index. Без внешних зависимостей.
const fs = require("fs");
const path = require("path");

const BRAIN = process.env.OPENCODE_BRAIN || path.join(__dirname, "..", "brain");
const MEMORY = path.join(BRAIN, "MEMORY.md");
const LONG = path.join(BRAIN, "memory", "LONG_TERM.md");

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (name.endsWith(".md")) out.push(full);
  }
  return out;
}

function save(args) {
  const long = args.includes("--long");
  const clean = args.filter((a) => a !== "--long");
  if (clean.length < 2) {
    console.error("Использование: brain.js save <тема> <текст> [--long]");
    process.exit(1);
  }
  const [topic, ...rest] = clean;
  const line = `- [${stamp()}] ${topic} — ${rest.join(" ")}`;

  const daily = path.join(BRAIN, "memory", `${today()}.md`);
  fs.mkdirSync(path.dirname(daily), { recursive: true });
  if (!fs.existsSync(daily)) {
    fs.writeFileSync(daily, `# ${today()}\n\n`, "utf8");
  }
  fs.appendFileSync(daily, line + "\n", "utf8");
  console.log("Записано в", daily);

  if (long) {
    fs.appendFileSync(LONG, line + "\n", "utf8");
    console.log("Также в долгосрочную память:", LONG);
  }
}

function find(args) {
  const query = args.join(" ").toLowerCase();
  if (!query) {
    console.error("Использование: brain.js find <запрос>");
    process.exit(1);
  }
  let hits = 0;
  for (const file of walk(BRAIN)) {
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      if (line.toLowerCase().includes(query)) {
        console.log(`${path.relative(BRAIN, file)}:${i + 1}: ${line.trim()}`);
        hits++;
      }
    });
  }
  console.log(`\nНайдено: ${hits}`);
}

function allLines() {
  const out = [];
  for (const file of walk(BRAIN)) {
    fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((text, i) => {
      out.push({ file: path.relative(BRAIN, file), line: i + 1, text });
    });
  }
  return out;
}

function tags(args) {
  const filter = args.join(" ").replace(/^#/, "").toLowerCase();
  const counts = new Map();
  const hits = [];
  for (const item of allLines()) {
    for (const match of item.text.matchAll(/#([А-Яа-яЁёA-Za-z0-9_-]+)/g)) {
      const tag = match[1];
      if (/^[0-9a-fA-F]{3,8}$/.test(tag)) continue;
      counts.set(tag, (counts.get(tag) || 0) + 1);
      if (filter && tag.toLowerCase().includes(filter)) hits.push(`${item.file}:${item.line}: ${item.text.trim()}`);
    }
  }
  if (filter) {
    console.log(hits.length ? hits.slice(0, 80).join("\n") + `\n\nНайдено: ${hits.length}` : "Теги не найдены");
    return;
  }
  console.log([...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag, n]) => `#${tag} — ${n}`).join("\n"));
}

function links(args) {
  const filter = args.join(" ").toLowerCase();
  const counts = new Map();
  const hits = [];
  for (const item of allLines()) {
    for (const match of item.text.matchAll(/\[\[([^\]]+)\]\]/g)) {
      const link = match[1];
      counts.set(link, (counts.get(link) || 0) + 1);
      if (filter && link.toLowerCase().includes(filter)) hits.push(`${item.file}:${item.line}: ${item.text.trim()}`);
    }
  }
  if (filter) {
    console.log(hits.length ? hits.slice(0, 80).join("\n") + `\n\nНайдено: ${hits.length}` : "Ссылки не найдены");
    return;
  }
  console.log([...counts.entries()].sort((a, b) => b[1] - a[1]).map(([link, n]) => `[[${link}]] — ${n}`).join("\n"));
}

function digest() {
  const daily = path.join(BRAIN, "memory", `${today()}.md`);
  if (!fs.existsSync(daily)) { console.log("Сегодняшнего лога нет"); return; }
  const groups = new Map();
  for (const line of fs.readFileSync(daily, "utf8").split(/\r?\n/)) {
    if (!line.startsWith("- ")) continue;
    const match = line.match(/^- \[[^\]]+\]\s+(.+?)\s+—\s+(.*)$/);
    const topic = match ? match[1].trim() : "Прочее";
    if (!groups.has(topic)) groups.set(topic, []);
    groups.get(topic).push(line);
  }
  for (const [topic, items] of groups) {
    console.log(`\n## ${topic} (${items.length})`);
    console.log(items.join("\n"));
  }
}

const [cmd, ...args] = process.argv.slice(2);
switch (cmd) {
  case "save": save(args); break;
  case "find": find(args); break;
  case "tags": tags(args); break;
  case "links": links(args); break;
  case "digest": digest(); break;
  case "index": console.log(fs.readFileSync(MEMORY, "utf8")); break;
  default:
    console.log("Команды: save <тема> <текст> [--long] | find <запрос> | tags [тег] | links [имя] | digest | index");
}
