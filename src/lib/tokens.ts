import { createHash, randomBytes } from "crypto";

// Opaque tokens: the raw value goes to the user (cookie / email link),
// only its SHA-256 hash is stored in the database.
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
