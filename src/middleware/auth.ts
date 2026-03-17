import type { Request, Response, NextFunction } from "express";

/**
 * Auth middleware: requires a valid session.
 * Use on routes that should only be accessible to logged-in users.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session.userId !== undefined) {
    next();
  } else {
    res.status(401).json({ error: "Authentication required" });
  }
}
