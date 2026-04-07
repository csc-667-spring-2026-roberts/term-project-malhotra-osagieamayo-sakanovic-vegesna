import type { Request, Response, NextFunction } from "express";

/**
 * Auth middleware: requires a valid session.
 * Redirects to the login page for browser requests (M7).
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session.userId !== undefined) {
    next();
  } else {
    res.redirect("/login");
  }
}

/** M8: Protected JSON routes — fetch() must not receive an HTML login redirect. */
export function requireAuthApi(req: Request, res: Response, next: NextFunction): void {
  if (req.session.userId !== undefined) {
    next();
  } else {
    res.status(401).json({ error: "Authentication required" });
  }
}
