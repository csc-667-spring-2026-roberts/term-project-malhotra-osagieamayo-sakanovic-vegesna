import app from "./app.js";

const PORT = Number(process.env["PORT"] ?? 3000);

app.listen(PORT, () => {
  console.log(`Express Skip-Bo server listening on port ${String(PORT)}`);
});
