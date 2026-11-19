import { site } from "@/content/site";
import type {
  ApiErrorBody,
  Availability,
  BookingRequestInput,
  ConfirmedBooking,
  NewsletterRequestInput,
} from "@/lib/schemas";

/** A failed API call, with the server's own code and message when it sent one. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, cache: "no-store", headers: { Accept: "application/json", ...init.headers } });
  } catch (err) {
    if (init.signal?.aborted) throw err; // the caller cancelled: not an error to show
    throw new ApiRequestError(0, "network", site.api.network);
  }
  const data = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const e = (data as Partial<ApiErrorBody> | null)?.error;
    throw new ApiRequestError(res.status, e?.code ?? "http_error", e?.message ?? site.api.generic, e?.fields ?? {});
  }
  return data as T;
}

const postJson = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const fetchAvailability = (date: string, signal?: AbortSignal) =>
  request<Availability>(`/api/availability?date=${encodeURIComponent(date)}`, { signal });

export const createBooking = (input: BookingRequestInput) =>
  postJson<{ booking: ConfirmedBooking }>("/api/bookings", input).then((r) => r.booking);

export const subscribeNewsletter = (input: NewsletterRequestInput) =>
  postJson<{ subscribed: true }>("/api/newsletter", input);
