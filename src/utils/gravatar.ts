import crypto from "node:crypto";

/**
 * Gravatar image URL for an email (MD5 hash, lowercase trimmed per Gravatar spec).
 */
export function gravatarUrl(email: string): string {
  const hash = crypto.createHash("md5").update(email.trim().toLowerCase()).digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=120`;
}
