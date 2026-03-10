import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import testDbRouter from "./routes/testDb.js";
import db from "./db/connection.js";


// load variables from .env
dotenv.config();

// recreating __dirname because ES modules decided to remove it for some reason
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "..", "public"); // figure out where the public folder is
// start express application
const app = express();

app.use(express.json()); // allows server to read JSON requests
app.use(express.urlencoded({ extended: true })); // allows reading form submissions
// extended:true just lets it handle more complex objects i think

app.use(express.static(publicDir)); // serve static files /public

app.get("/", (_req, res) => { // route root
  res.type("text/plain").send("Skip-Bo server running");
});

app.get("/api/health", (_req, res) => { // health check route
  res.json({ status: "ok" });
});

app.use("/", testDbRouter); // we are plugging in our test database router

// optional database connection check when the server starts
// basically just making sure postgres actually connects
db.connect()
  .then((obj) => {
    console.log("Connected to PostgreSQL successfully");
    // release connection back to the pool
    obj.done();
  })
  .catch((error) => {
    // check err if databse dies
    console.error("Database connection failed:", error);
  });

export default app;


