import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import testDbRouter from "./routes/testDb.js";
import authRouter from "./routes/auth.js";
import { requireAuth } from "./middleware/auth.js";
import { gravatarUrl } from "./utils/gravatar.js";
import db from "./db/connection.js";

// load variables from .env
dotenv.config();

const SESSION_SECRET = process.env["SESSION_SECRET"];
if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET is not set in .env");
}

const PgSession = connectPgSimple(session);

// recreating __dirname because ES modules decided to remove it for some reason
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "..", "public");
const viewsDir = path.resolve(__dirname, "..", "views");

const app = express();

// M7: EJS templating
app.set("view engine", "ejs");
app.set("views", viewsDir);

app.use(express.json()); // allows server to read JSON requests
app.use(express.urlencoded({ extended: true })); // allows reading form submissions
// extended:true just lets it handle more complex objects i think

// M6: Session with PostgreSQL store (sessions survive server restart)
app.use(
  session({
    store: new PgSession({
      pgPromise: db,
      createTableIfMissing: true,
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env["NODE_ENV"] === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }),
);

// M7: Server-rendered pages (before static)
app.get("/", (req, res) => {
  if (req.session.userId !== undefined) {
    res.redirect("/lobby");
  } else {
    res.redirect("/login");
  }
});

app.get("/login", (req, res) => {
  if (req.session.userId !== undefined) {
    res.redirect("/lobby");
    return;
  }
  const error = typeof req.query.error === "string" ? req.query.error : undefined;
  res.render("login", { error });
});

app.get("/register", (req, res) => {
  if (req.session.userId !== undefined) {
    res.redirect("/lobby");
    return;
  }
  const error = typeof req.query.error === "string" ? req.query.error : undefined;
  res.render("register", { error });
});

app.get("/lobby", requireAuth, (req, res) => {
  const email = req.session.email ?? "";
  res.render("lobby", {
    user: { id: req.session.userId, email },
    gravatarUrl: gravatarUrl(email),
  });
});

app.use(express.static(publicDir));

app.get("/api/health", (_req, res) => {
  // health check route
  res.json({ status: "ok" });
});

app.use("/", testDbRouter); // we are plugging in our test database router
app.use("/auth", authRouter); // M6: auth routes (register, login, logout)

// optional database connection check when the server starts
// basically just making sure postgres actually connects
/* eslint-disable @typescript-eslint/no-floating-promises -- fire-and-forget startup check */
db.connect()
  .then((obj) => {
    console.log("Connected to PostgreSQL successfully");
    obj.done();
  })
  .catch((error: unknown) => {
    console.error("Database connection failed:", error);
  });
/* eslint-enable @typescript-eslint/no-floating-promises */

export default app;
