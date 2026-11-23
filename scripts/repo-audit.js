#!/usr/bin/env node
// Аудит репозитория только для чтения: node repo-audit.js <папка> [--name имя] [--json] [--no-save]
const path = require("path");
const { pathToFileURL } = require("node:url");

const CORE = pathToFileURL(path.join(__dirname, "audit-core.mjs")).href;

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args[0].startsWith("--")) {
    console.error("Использование: repo-audit.js <папка> [--name имя] [--json] [--no-save]");
    process.exit(1);
  }
  const directory = args[0];
  const opts = { json: args.includes("--json"), save: !args.includes("--no-save"), name: undefined };
  const ni = args.indexOf("--name");
  if (ni >= 0 && args[ni + 1]) opts.name = args[ni + 1];

  const core = await import(CORE);
  const a = core.auditRepo(directory, { name: opts.name });
  const report = core.renderReport(a);

  if (opts.json) {
    process.stdout.write(JSON.stringify(a, null, 2));
    return;
  }
  console.log(report);
  if (opts.save) {
    const out = core.saveReport(a);
    console.log(`\nОтчёт: ${out}`);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
