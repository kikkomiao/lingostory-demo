import { createReadStream, statSync } from "node:fs";
import { createServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./", import.meta.url));
const port = Number(process.env.PORT || 8000);
const apiTarget = new URL(process.env.LINGOSTORY_API_TARGET || "http://127.0.0.1:8790");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".onnx": "application/octet-stream",
  ".png": "image/png",
  ".wasm": "application/wasm",
};

function proxyApi(clientRequest, clientResponse) {
  const upstreamUrl = new URL(clientRequest.url, apiTarget);
  const transport = upstreamUrl.protocol === "https:" ? httpsRequest : httpRequest;
  const upstream = transport(
    upstreamUrl,
    {
      method: clientRequest.method,
      headers: { ...clientRequest.headers, host: upstreamUrl.host },
      timeout: 60000,
    },
    (response) => {
      clientResponse.writeHead(response.statusCode || 502, response.headers);
      response.pipe(clientResponse);
    },
  );
  upstream.on("timeout", () => upstream.destroy(new Error("API proxy timeout")));
  upstream.on("error", (error) => {
    if (clientResponse.headersSent) {
      clientResponse.destroy(error);
      return;
    }
    clientResponse.writeHead(502, { "content-type": "application/json; charset=utf-8" });
    clientResponse.end(JSON.stringify({ error: `剧情服务不可用：${error.message}` }));
  });
  clientRequest.pipe(upstream);
}

function serveStatic(request, response) {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const aliasedPath = pathname.startsWith("/assets/npc/")
    ? pathname.replace("/assets/npc/", "/npc/")
    : pathname;
  const relativePath = aliasedPath === "/" ? "index.html" : aliasedPath.replace(/^\/+/, "");
  const filePath = resolve(root, normalize(relativePath));
  if (!filePath.startsWith(resolve(root))) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const stats = statSync(filePath);
    if (!stats.isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "content-type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "content-length": stats.size,
      "cache-control": "no-cache",
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

createServer((request, response) => {
  if (request.url?.startsWith("/api/")) proxyApi(request, response);
  else serveStatic(request, response);
}).listen(port, "127.0.0.1", () => {
  console.log(`LingoStory: http://127.0.0.1:${port}`);
  console.log(`API proxy: ${apiTarget.origin}`);
});
