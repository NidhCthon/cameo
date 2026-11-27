// Serve the repo so tools/preview/frames.html can import the real scripts.
// A browser refuses ES module imports over file://, so the preview needs this.
//
//   node tools/preview/serve.mjs
//
// Then open http://127.0.0.1:8714/tools/preview/frames.html
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const port = Number(process.argv[2]) || 8714;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8"
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  // Keep the server inside the repo, whatever the request asks for.
  const file = join(root, normalize(path).replace(/^([/\\])+/, ""));
  if (!file.startsWith(root + sep)) {
    res.writeHead(403).end("outside the repo");
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file).toLowerCase()] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`http://127.0.0.1:${port}/tools/preview/frames.html`);
});
