// Local MCP proxy: injects Obsidian Local REST API bearer token.
// Keeps the API key out of OpenCode config and out of environment variables.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.OBSIDIAN_PROXY_PORT || 27125);
const UPSTREAM_HOST = "127.0.0.1";
const UPSTREAM_PORT = Number(process.env.OBSIDIAN_REST_PORT || 27123);
const DATA_FILE = path.join(
  process.env.USERPROFILE || process.env.HOME || "",
  "Desktop",
  "opencode-boost",
  "brain",
  ".obsidian",
  "plugins",
  "obsidian-local-rest-api",
  "data.json"
);

function readKey() {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  if (!data.apiKey) throw new Error("apiKey missing in " + DATA_FILE);
  return data.apiKey;
}

let key;
try {
  key = readKey();
} catch (err) {
  console.error("Cannot read Obsidian API key:", err.message);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const headers = { ...req.headers };
  headers.host = UPSTREAM_HOST + ":" + UPSTREAM_PORT;
  headers.authorization = "Bearer " + key;

  const upstream = http.request(
    {
      hostname: UPSTREAM_HOST,
      port: UPSTREAM_PORT,
      path: req.url,
      method: req.method,
      headers,
    },
    (upRes) => {
      res.writeHead(upRes.statusCode || 502, upRes.headers);
      upRes.pipe(res);
    }
  );

  upstream.on("error", (err) => {
    if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain" });
    res.end("Obsidian MCP upstream error: " + err.message);
  });

  req.pipe(upstream);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Obsidian MCP proxy listening on http://127.0.0.1:${PORT}/mcp/`);
});
