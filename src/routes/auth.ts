import { Router } from "express";
import bcrypt from "bcrypt";
import db from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";

const BCRYPT_COST = 10;

// Generic error message for login failures (security: don't reveal if email exists)
const INVALID_CREDENTIALS = "Invalid email or password";

interface UserRow {
  id: number;
  email: string;
  password_hash?: string;
  created_at?: Date;
}

const router = Router();

/**
 * POST /auth/register
 * Validate input, hash password with bcrypt, insert user, set session.
 */
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: unknown; password?: unknown };

    if (typeof email !== "string" || typeof password !== "string") {
      res.status(400).render("register", { error: "Email and password are required" });
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      res.status(400).render("register", { error: "Email cannot be empty" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      res.status(400).render("register", { error: "Invalid email format" });
      return;
    }

    if (password.length < 8) {
      res.status(400).render("register", {
        error: "Password must be at least 8 characters",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    const user = await db.one<UserRow>(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [trimmedEmail, passwordHash],
    );

    req.session.userId = user.id;
    req.session.email = user.email;

    res.redirect("/lobby");
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === "23505") {
      res.status(409).render("register", { error: "Email already registered" });
      return;
    }
    console.error("POST /auth/register failed:", error);
    res.status(500).render("register", { error: "Registration failed" });
  }
});

/**
 * POST /auth/login
 * Look up user, compare password with bcrypt, set session on success.
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: unknown; password?: unknown };

    if (typeof email !== "string" || typeof password !== "string") {
      res.status(400).render("login", { error: "Email and password are required" });
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      res.status(401).render("login", { error: INVALID_CREDENTIALS });
      return;
    }

    const user = await db.oneOrNone<UserRow>(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [trimmedEmail],
    );

    if (!user?.password_hash) {
      res.status(401).render("login", { error: INVALID_CREDENTIALS });
      return;
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      res.status(401).render("login", { error: INVALID_CREDENTIALS });
      return;
    }

    req.session.userId = user.id;
    req.session.email = user.email;

    res.redirect("/lobby");
  } catch (error) {
    console.error("POST /auth/login failed:", error);
    res.status(500).render("login", { error: "Login failed" });
  }
});

/**
 * GET /auth/me
 * Redirects to lobby when authenticated (HTML flow).
 */
router.get("/me", requireAuth, (_req, res) => {
  res.redirect("/lobby");
});

/**
 * POST /auth/logout
 * Destroy session.
 */
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("POST /auth/logout failed:", err);
      res.redirect("/login?error=" + encodeURIComponent("Logout failed"));
      return;
    }
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
});

export default router;
