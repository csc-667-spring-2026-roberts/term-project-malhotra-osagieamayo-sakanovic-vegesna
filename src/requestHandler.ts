import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile, writeFile, rm } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".htm": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".txt": "text/plain",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = req.method ?? "";
  const url = new URL(req.url ?? "/", `http://${req.headers["host"] ?? "localhost"}`);
  const requestPath = decodeURIComponent(url.pathname);

  if (!["GET", "PUT", "DELETE"].includes(method)) {
    sendResponse(res, 405, "Method Not Allowed", "text/plain");
    return;
  }

  const filePath = resolvePublicPath(requestPath);
  if (!filePath) {
    sendResponse(res, 403, "Forbidden", "text/plain");
    return;
  }

  if (method === "GET") {
    await handleGet(res, filePath, requestPath);
    return;
  }

  const authHeader = req.headers["authorization"];
  if (!validateBasicAuth(authHeader)) {
    sendResponse(res, 401, "Unauthorized", "text/plain", {
      "WWW-Authenticate": 'Basic realm="Document Server"',
    });
    return;
  }

  if (method === "PUT") {
    await handlePut(req, res, filePath);
    return;
  }

  if (method === "DELETE") {
    await handleDelete(res, filePath);
    return;
  }
}

function resolvePublicPath(requestPath: string): string | null {
  const relative = path.join(".", requestPath.replace(/^\/+/, "") || ".");
  const fullPath = path.resolve(PUBLIC_DIR, relative);
  return fullPath.startsWith(PUBLIC_DIR) ? fullPath : null;
}

async function handleGet(
  res: ServerResponse,
  filePath: string,
  requestPath: string,
): Promise<void> {
  const isDirRequest = requestPath.endsWith("/") || requestPath === "";
  let targetPath = isDirRequest ? path.join(filePath, "index.html") : filePath;

  if (!existsSync(filePath)) {
    sendResponse(res, 404, "Not Found", "text/plain");
    return;
  }

  if (!isDirRequest && statSync(filePath).isDirectory()) {
    targetPath = path.join(filePath, "index.html");
  }
  if (!existsSync(targetPath)) {
    sendResponse(res, 404, "Not Found", "text/plain");
    return;
  }

  try {
    const content = await readFile(targetPath);
    const ext = path.extname(targetPath);
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
    sendResponse(res, 200, Buffer.from(content), contentType, {}, false);
  } catch {
    sendResponse(res, 500, "Internal Server Error", "text/plain");
  }
}

async function handlePut(
  req: IncomingMessage,
  res: ServerResponse,
  filePath: string,
): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks);

  try {
    const dir = path.dirname(filePath);
    if (!existsSync(dir)) {
      await import("node:fs/promises").then((fs) => fs.mkdir(dir, { recursive: true }));
    }
    const existed = existsSync(filePath);
    await writeFile(filePath, body);
    sendResponse(res, existed ? 204 : 201, "", "text/plain", {}, false);
  } catch {
    sendResponse(res, 500, "Internal Server Error", "text/plain");
  }
}

async function handleDelete(res: ServerResponse, filePath: string): Promise<void> {
  if (!existsSync(filePath)) {
    sendResponse(res, 404, "Not Found", "text/plain");
    return;
  }

  try {
    await rm(filePath);
    sendResponse(res, 204, "", "text/plain", {}, false);
  } catch {
    sendResponse(res, 500, "Internal Server Error", "text/plain");
  }
}

function validateBasicAuth(authHeader: string | string[] | undefined): boolean {
  if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Basic ")) {
    return false;
  }
  const encoded = authHeader.slice(6);
  const decoded = Buffer.from(encoded, "base64").toString("utf-8");
  const [user, pass] = decoded.split(":", 2);
  const expectedUser = process.env["AUTH_USER"] ?? "admin";
  const expectedPass = process.env["AUTH_PASS"] ?? "secret";
  return user === expectedUser && pass === expectedPass;
}

function sendResponse(
  res: ServerResponse,
  statusCode: number,
  body: string | Buffer,
  contentType: string,
  extraHeaders: Record<string, string> = {},
  stringify = true,
): void {
  const isNoContent = statusCode === 204;
  const content = isNoContent
    ? Buffer.alloc(0)
    : stringify && typeof body === "string"
      ? Buffer.from(body, "utf-8")
      : body;

  const headers: Record<string, string | number> = {
    Connection: "close",
    Date: new Date().toUTCString(),
    ...extraHeaders,
  };
  if (!isNoContent) {
    headers["Content-Type"] = contentType;
    headers["Content-Length"] = content.length;
  }
  res.writeHead(statusCode, headers);
  res.end(content);
}
