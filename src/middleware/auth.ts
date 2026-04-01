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
