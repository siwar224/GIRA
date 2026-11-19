import { z } from "zod";
import { booking, type Meal, type OccasionId } from "@/content/booking";
import { crea } from "@/content/crea";
import { visit } from "@/content/sections";
import type { Selection } from "@/lib/crea";

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

/** A phone number as people type it: digits, spaces, + ( ) . - ; 8 to 15 digits. */
export const phone = z
  .string()
  .trim()
  .max(32, D.phone.error)
  .regex(/^\+?[\d\s().-]+$/, D.phone.error)
  .refine((v) => {
    const digits = v.replace(/\D/g, "").length;
    return digits >= 8 && digits <= 15;
  }, D.phone.error);

/** "GIRA-7KQ2XM9P", forgiving about case and spaces. */
export const bookingCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^GIRA-[A-HJ-NP-Z2-9]{8}$/, booking.manage.lookup.codeError);

export const bookingRequest = z.object({
  date: isoDate,
  time: hhmm,
  guests: z.number().int().min(booking.guests.min).max(booking.guests.max),
  occasion: z.enum(OCCASIONS).default("none"),
  tableId: z.string().regex(/^[A-Z0-9]{1,8}$/, "Unknown table."),
  name: z.string().trim().min(1, D.name.error).max(80).refine(noControl, D.name.error),
  phone,
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

// ── Waiting list: a full moment, and a guest who'd like to hear if a table frees up ──

export const waitlistRequest = z.object({
  date: isoDate,
  meal: z.enum(["lunch", "dinner"]),
  guests: z.number().int().min(booking.guests.min).max(booking.guests.max),
  name: z.string().trim().min(1, D.name.error).max(80).refine(noControl, D.name.error),
  phone,
  email: z
    .string()
    .trim()
    .max(254, D.email.error)
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || EMAIL_RE.test(v), D.email.error),
  /** Honeypot, as on the booking form. */
  website: z.string().max(0).optional(),
});
export type WaitlistRequest = z.infer<typeof waitlistRequest>;
export type WaitlistRequestInput = z.input<typeof waitlistRequest>;

// ── Managing a booking: the code and the phone number prove it's yours ──────────

export const lookupRequest = z.object({ code: bookingCode, phone });
export type LookupRequest = z.infer<typeof lookupRequest>;

export const cancelRequest = z.object({ phone });

/** Ids allowed for one field of the plate builder, taken from the menu itself. */
const ids = <T extends string>(list: readonly { id: T }[]) => z.enum(list.map((x) => x.id) as [T, ...T[]]);
const point = z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) });

/** One "Crea il tuo" plate, as the builder stores it in the cart. Prices are never accepted. */
export const plateSelection = z.object({
  pasta: ids(crea.pastas),
  sauce: ids(crea.sauces),
  seafood: z.array(ids(crea.seafood.items)).max(crea.seafood.max),
  spice: ids(crea.spice.options),
  remove: z.array(ids(crea.remove.options)).max(crea.remove.options.length),
  extras: z.array(ids(crea.extras.items)).max(crea.extras.items.length),
  cooking: ids(crea.cooking.options),
  portion: ids(crea.portion.options),
  note: z.string().trim().max(crea.note.max).refine(noControl, "Please remove special characters.").default(""),
  placements: z.record(z.string().max(32), point).default({}),
}) satisfies z.ZodType<Selection, unknown>;

export const preorderRequest = z.object({
  phone,
  items: z.array(plateSelection).min(1, booking.manage.preorder.empty).max(10, booking.manage.preorder.tooMany),
});
export type PreorderRequest = z.infer<typeof preorderRequest>;
export type PreorderRequestInput = z.input<typeof preorderRequest>;

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
  /** A confirmation email is on its way (the guest gave an address and sending is set up). */
  emailSent: boolean;
};

/** A plate in a pre-order, priced by the server. */
export type PreorderItem = { name: string; details: string[]; allergens: string[]; price: number };

export type Preorder = { items: PreorderItem[]; total: number; updatedAt: string };

/** POST /api/bookings/lookup → { booking } */
export type BookingDetails = {
  code: string;
  date: string;
  time: string;
  guests: number;
  meal: Meal;
  occasion: OccasionId;
  tableId: string;
  name: string;
  /** Partly hidden: "g•••@example.com". */
  email: string | null;
  note: string | null;
  /** Still to come: it can be cancelled and pre-ordered for. */
  upcoming: boolean;
  preorder: Preorder | null;
};

// ── La sala (the team's view, signed in) ──────────────────────────────────────

export const serviceQuery = z.object({ date: isoDate, meal: z.enum(["lunch", "dinner"]) });

/** A table's booking during a service. */
export type SalaBooking = {
  code: string;
  tableId: string;
  time: string;
  /** Minutes from midnight: the table is taken from startMin until endMin. */
  startMin: number;
  endMin: number;
  guests: number;
  name: string;
  phone: string;
  occasion: OccasionId;
  note: string | null;
  preorder: PreorderItem[] | null;
};

export type SalaWaiting = { name: string; guests: number; phone: string; email: string | null; createdAt: string; notified: boolean };

/** GET /api/staff/service */
export type SalaService = {
  date: string;
  meal: Meal;
  /** The service's times, from first to last booking slot. */
  slots: string[];
  bookings: SalaBooking[];
  waitlist: SalaWaiting[];
};

/** Any non-2xx response. */
export type ApiErrorBody = { error: { code: string; message: string; fields?: Record<string, string[]> } };
