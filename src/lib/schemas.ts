import { z } from "zod";
import { booking, type Meal, type OccasionId } from "@/content/booking";
import { visit } from "@/content/sections";

/**
 * Request shapes for the API, shared by the browser (to check before sending) and the
 * server (which never trusts the browser and checks again). Shape only: whether a time is
 * really bookable, or a table really free, is decided by the server's booking service.
 */

/** Same rule the booking form already uses. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Control characters other than tab and newline. */
const CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F]/;
const noControl = (v: string) => !CONTROL.test(v);

const OCCASIONS = ["none", "birthday", "anniversary", "business"] as const satisfies readonly OccasionId[];

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD format.");
export const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use the HH:MM format.");

export const availabilityQuery = z.object({ date: isoDate });
export type AvailabilityQuery = z.infer<typeof availabilityQuery>;

const D = booking.details;

export const bookingRequest = z.object({
  date: isoDate,
  time: hhmm,
  guests: z.number().int().min(booking.guests.min).max(booking.guests.max),
  occasion: z.enum(OCCASIONS).default("none"),
  tableId: z.string().regex(/^[A-Z0-9]{1,8}$/, "Unknown table."),
  name: z.string().trim().min(1, D.name.error).max(80).refine(noControl, D.name.error),
  phone: z
    .string()
    .trim()
    .max(32, D.phone.error)
    .regex(/^\+?[\d\s().-]+$/, D.phone.error)
    .refine((v) => {
      const digits = v.replace(/\D/g, "").length;
      return digits >= 8 && digits <= 15;
    }, D.phone.error),
  email: z
    .string()
    .trim()
    .max(254, D.email.error)
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || EMAIL_RE.test(v), D.email.error),
  note: z
    .string()
    .trim()
    .max(D.note.max)
    .refine(noControl, "Please remove special characters.")
    .optional()
    .transform((v) => v || null),
  /** Honeypot: a field people never see. Anything typed into it means a bot. */
  website: z.string().max(0).optional(),
});
export type BookingRequest = z.infer<typeof bookingRequest>;
export type BookingRequestInput = z.input<typeof bookingRequest>;

const N = visit.newsletter.errors;

export const newsletterRequest = z.object({
  email: z.string().trim().toLowerCase().min(1, N.empty).max(254, N.invalid).regex(EMAIL_RE, N.invalid),
  /** Honeypot, as on the booking form. */
  website: z.string().max(0).optional(),
});
export type NewsletterRequest = z.infer<typeof newsletterRequest>;
export type NewsletterRequestInput = z.input<typeof newsletterRequest>;

// ── Responses ─────────────────────────────────────────────────────────────────

/** GET /api/availability */
export type Availability = {
  date: string;
  durationMinutes: number;
  /** Every bookable time of the day, with the tables that can't be booked then. */
  slots: { time: string; meal: Meal; taken: string[] }[];
};

/** POST /api/bookings → { booking } */
export type ConfirmedBooking = {
  code: string;
  date: string;
  time: string;
  guests: number;
  meal: Meal;
  occasion: OccasionId;
  tableId: string;
  name: string;
  createdAt: string;
};

/** Any non-2xx response. */
export type ApiErrorBody = { error: { code: string; message: string; fields?: Record<string, string[]> } };
