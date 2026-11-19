import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv, staffPassword } from "./env";
import { ApiError } from "./http";

/**
 * The team's sign-in for La sala: one shared password (STAFF_PASSWORD), then a signed,
 * HttpOnly cookie for one service. No accounts, no user table.
 *
 * Cookie value: "<expiry ms>.<HMAC-SHA256(expiry)>". The key is derived from the password
 * and RATE_LIMIT_SALT, so changing the password signs everyone out at once.
 */

export const STAFF_COOKIE = "gira_staff";
export const SESSION_HOURS = 12;

const sameText = (a: string, b: string) => {
  // Hash first so lengths never leak through the comparison.
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
};

function key(): Buffer {
  const password = staffPassword();
  if (!password) throw new ApiError(503, "staff_not_configured", "La sala isn't set up yet (STAFF_PASSWORD).");
  return createHash("sha256").update(`${serverEnv().RATE_LIMIT_SALT}:staff:${password}`).digest();
}

const sign = (expires: number) => createHmac("sha256", key()).update(String(expires)).digest("base64url");

/** Checks the password and returns a fresh session token, or throws a 401. */
export function signIn(password: string): { token: string; maxAge: number } {
  const expected = staffPassword();
  if (!expected) throw new ApiError(503, "staff_not_configured", "La sala isn't set up yet (STAFF_PASSWORD).");
  if (!sameText(password, expected)) throw new ApiError(401, "wrong_password", "That password isn't right.");
  const maxAge = SESSION_HOURS * 3600;
  const expires = Date.now() + maxAge * 1000;
  return { token: `${expires}.${sign(expires)}`, maxAge };
}

/** Is this cookie value a valid, unexpired session? */
export function isValidSession(token: string | undefined, now = Date.now()): boolean {
  if (!token || !staffPassword()) return false;
  const [expiresText, mac] = token.split(".");
  const expires = Number(expiresText);
  if (!mac || !Number.isFinite(expires) || expires <= now) return false;
  return sameText(mac, sign(expires));
}

/** Reads the session cookie from a request; throws a 401 without a valid one. */
export function assertStaff(request: Request): void {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${STAFF_COOKIE}=`))
    ?.slice(STAFF_COOKIE.length + 1);
  if (!isValidSession(token)) throw new ApiError(401, "signed_out", "Please sign in to La sala.");
}

/** Set-Cookie header value: HttpOnly, Secure (except on localhost), same-site only. */
export function sessionCookie(token: string, maxAge: number, request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${STAFF_COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${secure}`;
}
