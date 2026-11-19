import "server-only";
import { z } from "zod";

/**
 * Small HTTP toolkit shared by the route handlers: JSON responses, one error format,
 * and the request checks every write goes through.
 *
 * Every error body has the same shape:
 *   { "error": { "code": "validation_failed", "message": "…", "fields": { "phone": ["…"] } } }
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly extra: { fields?: Record<string, string[]>; headers?: Record<string, string> } = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const BASE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(data, { status, headers: { ...BASE_HEADERS, ...headers } });
}

function errorResponse(err: ApiError): Response {
  const body: { code: string; message: string; fields?: Record<string, string[]> } = {
    code: err.code,
    message: err.message,
  };
  if (err.extra.fields) body.fields = err.extra.fields;
  return json({ error: body }, err.status, err.extra.headers);
}

/**
 * Wraps a route handler: known errors become their JSON response, anything else is
 * logged (name and message only, never the request body) and answered with a plain 500.
 */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ApiError) return errorResponse(err);
      const e = err instanceof Error ? err : new Error(String(err));
      console.error(`[api] ${e.name}: ${e.message}`);
      return errorResponse(new ApiError(500, "internal_error", "Something went wrong on our side. Please try again."));
    }
  };
}

/** Turns a zod failure into a 422 with a message per field. */
export function parseOr422<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const flat = z.flattenError(result.error);
  const fields = Object.fromEntries(
    Object.entries(flat.fieldErrors).filter((e): e is [string, string[]] => Array.isArray(e[1]) && e[1].length > 0),
  );
  throw new ApiError(422, "validation_failed", "Some details need another look.", {
    fields: Object.keys(fields).length ? fields : undefined,
  });
}

/**
 * Only this site's own pages may write. Blocks cross-site form posts and scripts on other
 * origins (CSRF); a non-browser client can still forge headers, which is what rate
 * limiting and server-side validation are for.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let ok = false;
  try {
    ok = !!origin && !!host && new URL(origin).host === host;
  } catch {
    ok = false;
  }
  if (!ok || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new ApiError(403, "forbidden_origin", "This request must come from the GIRA website.");
  }
}

/** Reads a small JSON body: right content type, size capped, valid JSON. */
export async function readJson(request: Request, maxBytes = 4_096): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) {
    throw new ApiError(415, "unsupported_media_type", "Send the request as JSON.");
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new ApiError(413, "payload_too_large", "The request is too large.");

  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) {
    throw new ApiError(413, "payload_too_large", "The request is too large.");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(400, "invalid_json", "The request body is not valid JSON.");
  }
}

/** The caller's IP as seen by Vercel's edge (first hop of x-forwarded-for). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}
