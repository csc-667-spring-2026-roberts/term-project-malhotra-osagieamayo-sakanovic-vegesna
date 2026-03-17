import { Router } from "express";
import bcrypt from "bcrypt";
import db from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";

const BCRYPT_COST = 10;

// Generic error message for login failures (security: don't reveal if email exists)
const INVALID_CREDENTIALS = "Invalid email or password";

/** True if request is form POST (M7: redirect for server-rendered flow) */
function isFormSubmit(req: { get(name: string): string | undefined }): boolean {
  const ct = req.get("Content-Type") ?? "";
  return ct.includes("application/x-www-form-urlencoded");
}

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
      if (isFormSubmit(req)) {
        res.redirect("/?tab=signup&error=" + encodeURIComponent("Email and password are required"));
        return;
      }
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      if (isFormSubmit(req)) {
        res.redirect("/?tab=signup&error=" + encodeURIComponent("Email cannot be empty"));
        return;
      }
      res.status(400).json({ error: "email cannot be empty" });
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      if (isFormSubmit(req)) {
        res.redirect("/?tab=signup&error=" + encodeURIComponent("Invalid email format"));
        return;
      }
      res.status(400).json({ error: "invalid email format" });
      return;
    }

    if (password.length < 8) {
      if (isFormSubmit(req)) {
        res.redirect(
          "/?tab=signup&error=" + encodeURIComponent("Password must be at least 8 characters"),
        );
        return;
      }
      res.status(400).json({ error: "password must be at least 8 characters" });
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

    if (isFormSubmit(req)) {
      res.redirect("/");
      return;
    }
    res.status(201).json({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    });
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError.code === "23505") {
      if (isFormSubmit(req)) {
        res.redirect("/?tab=signup&error=" + encodeURIComponent("Email already registered"));
        return;
      }
      res.status(409).json({ error: "email already registered" });
      return;
    }
    console.error("POST /auth/register failed:", error);
    if (isFormSubmit(req)) {
      res.redirect("/?tab=signup&error=" + encodeURIComponent("Registration failed"));
      return;
    }
    res.status(500).json({ error: "Registration failed" });
  }
});

/**
 * POST /auth/login
 * Look up user, compare password with bcrypt, set session on success.
 * Uses same error message for "email not found" and "wrong password" (security).
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: unknown; password?: unknown };

    if (typeof email !== "string" || typeof password !== "string") {
      if (isFormSubmit(req)) {
        res.redirect("/?tab=login&error=" + encodeURIComponent("Email and password are required"));
        return;
      }
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      if (isFormSubmit(req)) {
        res.redirect("/?tab=login&error=" + encodeURIComponent(INVALID_CREDENTIALS));
        return;
      }
      res.status(401).json({ error: INVALID_CREDENTIALS });
      return;
    }

    const user = await db.oneOrNone<UserRow>(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [trimmedEmail],
    );

    if (!user?.password_hash) {
      if (isFormSubmit(req)) {
        res.redirect("/?tab=login&error=" + encodeURIComponent(INVALID_CREDENTIALS));
        return;
      }
      res.status(401).json({ error: INVALID_CREDENTIALS });
      return;
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      if (isFormSubmit(req)) {
        res.redirect("/?tab=login&error=" + encodeURIComponent(INVALID_CREDENTIALS));
        return;
      }
      res.status(401).json({ error: INVALID_CREDENTIALS });
      return;
    }

    req.session.userId = user.id;
    req.session.email = user.email;

    if (isFormSubmit(req)) {
      res.redirect("/");
      return;
    }
    res.json({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error("POST /auth/login failed:", error);
    if (isFormSubmit(req)) {
      res.redirect("/?tab=login&error=" + encodeURIComponent("Login failed"));
      return;
    }
    res.status(500).json({ error: "Login failed" });
  }
});

/**
 * GET /auth/me
 * Protected by requireAuth middleware: returns current user.
 */
router.get("/me", requireAuth, (req, res) => {
  res.json({
    id: req.session.userId,
    email: req.session.email,
  });
});

/**
 * POST /auth/logout
 * Destroy session.
 */
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("POST /auth/logout failed:", err);
      if (isFormSubmit(req)) {
        res.redirect("/?error=" + encodeURIComponent("Logout failed"));
        return;
      }
      res.status(500).json({ error: "Logout failed" });
      return;
    }
    res.clearCookie("connect.sid");
    if (isFormSubmit(req)) {
      res.redirect("/");
      return;
    }
    res.json({ message: "Logged out" });
  });
});

export default router;
