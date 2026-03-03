import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "..", "public");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(publicDir));

app.get("/", (_req, res) => {
  res.type("text/plain").send("Skip-Bo server running");
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

export default app;
