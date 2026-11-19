import { z } from "zod";
import { assertSameOrigin, handle, json, parseOr422, readJson } from "@/server/http";
import { LIMITS, rateLimit } from "@/server/rate-limit";
import { assertStaff, sessionCookie, signIn, STAFF_COOKIE } from "@/server/staff-session";

export const dynamic = "force-dynamic";

const signInRequest = z.object({ password: z.string().min(1, "Enter the team password.").max(200) });

/** GET /api/staff/session — 200 when signed in, 401 otherwise. */
export const GET = handle(async (request: Request) => {
  assertStaff(request);
  return json({ signedIn: true });
});

/** POST /api/staff/session { password } — signs the team in for one service (12 h). */
export const POST = handle(async (request: Request) => {
  assertSameOrigin(request);
  const { password } = parseOr422(signInRequest, await readJson(request, 1_024));
  await rateLimit(request, LIMITS.staffSignIn);
  const { token, maxAge } = signIn(password);
  return json({ signedIn: true }, 200, { "Set-Cookie": sessionCookie(token, maxAge, request) });
});

/** DELETE /api/staff/session — signs out. */
export const DELETE = handle(async (request: Request) => {
  assertSameOrigin(request);
  return json({ signedIn: false }, 200, { "Set-Cookie": `${STAFF_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict` });
});
