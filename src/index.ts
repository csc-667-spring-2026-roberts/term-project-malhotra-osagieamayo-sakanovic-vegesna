import { createServer } from "node:http";
import { handleRequest } from "./requestHandler.js";

const PORT = parseInt(process.env["PORT"] ?? "3000", 10);

const server = createServer((req, res) => {
  handleRequest(req, res).catch((err: unknown) => {
    console.error("Unhandled error:", err);
    if (!res.headersSent) {
      sendError(res, 500, "Internal Server Error");
    } else {
      res.end();
    }
  });
});

server.listen(PORT, () => {
  console.log(`HTTP/1.1 server listening on port ${String(PORT)}`);
});

function sendError(
  res: import("node:http").ServerResponse,
  statusCode: number,
  message: string,
): void {
  const body = `${message}\n`;
  res.writeHead(statusCode, {
    "Content-Type": "text/plain",
    "Content-Length": Buffer.byteLength(body),
    Connection: "close",
    Date: new Date().toUTCString(),
  });
  res.end(body);
}
