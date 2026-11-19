import "server-only";
import { booking } from "@/content/booking";
import { visit } from "@/content/sections";
import { site } from "@/content/site";
import { longDate, tableById } from "@/lib/booking";
import { siteUrl } from "@/lib/site-url";
import type { Email } from "./email";

/** What a booking email needs to know. */
export type BookingEmailData = {
  to: string;
  code: string;
  name: string;
  date: string;
  time: string;
  guests: number;
  tableId: string;
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function tableLine(tableId: string): string {
  const t = tableById(tableId);
  const area = booking.areas.find((a) => a.id === t?.area);
  return [t?.label ?? tableId, area?.label].filter(Boolean).join(" · ");
}

const manageUrl = (code: string) => `${siteUrl}${booking.manage.href}?code=${encodeURIComponent(code)}`;

/** One small, branded layout for every message: crema card, GIRA red, plain fallback text. */
function layout(title: string, intro: string, rows: [string, string][], action?: { label: string; href: string }) {
  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#8a6b5c;font-size:14px">${escapeHtml(k)}</td>` +
        `<td style="padding:6px 0;color:#2b1a14;font-size:15px;font-weight:600">${escapeHtml(v)}</td></tr>`,
    )
    .join("");
  const button = action
    ? `<p style="margin:28px 0 0"><a href="${escapeHtml(action.href)}" style="display:inline-block;background:#812116;color:#fff6ea;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">${escapeHtml(action.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f3ead9;padding:32px 16px;font-family:Georgia,'Times New Roman',serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffaf1;border-radius:18px;padding:32px">
<tr><td>
<p style="margin:0 0 4px;color:#812116;font-size:28px;font-weight:700;letter-spacing:.08em">GIRA</p>
<p style="margin:0 0 24px;color:#8a6b5c;font-size:13px;letter-spacing:.12em;text-transform:uppercase">${escapeHtml(site.tagline)}</p>
<h1 style="margin:0 0 12px;color:#2b1a14;font-size:22px">${escapeHtml(title)}</h1>
<p style="margin:0 0 20px;color:#4a342a;font-size:15px;line-height:1.5">${escapeHtml(intro)}</p>
<table role="presentation" cellpadding="0" cellspacing="0">${rowsHtml}</table>
${button}
<p style="margin:32px 0 0;color:#8a6b5c;font-size:12px;line-height:1.5">${escapeHtml(visit.address.lines.join(", "))}</p>
</td></tr></table>
</td></tr></table>
</body></html>`;
}

const textOf = (title: string, intro: string, rows: [string, string][], action?: { label: string; href: string }) =>
  [`GIRA — ${site.tagline}`, "", title, "", intro, "", ...rows.map(([k, v]) => `${k}: ${v}`), ...(action ? ["", `${action.label}: ${action.href}`] : [])].join(
    "\n",
  );

export function bookingConfirmation(b: BookingEmailData): Email {
  const title = `See you on ${longDate(b.date)}, ${b.name.split(" ")[0]}.`;
  const intro = "Your table is booked and waiting for you. Show your booking code at the door.";
  const rows: [string, string][] = [
    ["Booking code", b.code],
    ["When", `${longDate(b.date)} · ${b.time}`],
    ["Guests", String(b.guests)],
    ["Table", tableLine(b.tableId)],
  ];
  const action = { label: "Manage, cancel or pre-order", href: manageUrl(b.code) };
  return {
    to: b.to,
    subject: `Your table at GIRA — ${longDate(b.date)}, ${b.time} (${b.code})`,
    text: textOf(title, intro, rows, action),
    html: layout(title, intro, rows, action),
  };
}

export function bookingCancellation(b: BookingEmailData): Email {
  const title = "Your booking is cancelled.";
  const intro = "Your table has been released. We hope to see you another time.";
  const rows: [string, string][] = [
    ["Booking code", b.code],
    ["Was for", `${longDate(b.date)} · ${b.time}`],
  ];
  const action = { label: "Book a new table", href: `${siteUrl}/prenota` };
  return {
    to: b.to,
    subject: `Booking cancelled — ${b.code}`,
    text: textOf(title, intro, rows, action),
    html: layout(title, intro, rows, action),
  };
}

export const __test = { escapeHtml };
