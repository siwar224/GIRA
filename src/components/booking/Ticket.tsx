"use client";
import { useEffect, useRef, useState } from "react";
import { booking } from "@/content/booking";
import { site } from "@/content/site";
import { icsFor, longDate, tableById, type SavedBooking } from "@/lib/booking";

type Props = { saved: SavedBooking; onAnother: () => void };

/** The confirmation as a "biglietto": a ticket with the details, the booking code and next steps. */
export function Ticket({ saved, onAnother }: Props) {
  const T = booking.ticket;
  const title = useRef<HTMLHeadingElement>(null);
  const [shared, setShared] = useState(false);
  const table = tableById(saved.tableId);
  const area = booking.areas.find((a) => a.id === table?.area);
  const occasion = booking.occasion.options.find((o) => o.id === saved.occasion);
  const when = `${longDate(saved.date)} · ${saved.time}`;

  useEffect(() => title.current?.focus(), []);

  const addToCalendar = () => {
    const blob = new Blob([icsFor(saved)], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gira-${saved.code}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const share = async () => {
    const text = `${T.calendarTitle} — ${when}, ${saved.guests} ${booking.guests.unit[1]}, ${table?.label ?? ""} (${saved.code})`;
    try {
      if (navigator.share) {
        await navigator.share({ title: T.calendarTitle, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setShared(true);
    } catch {
      /* the guest closed the share sheet */
    }
  };

  return (
    <div className="ticket-wrap">
      <article className="ticket" aria-labelledby="ticket-title">
        <div className="ticket__main">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={site.logo.dark.src} alt={site.logo.alt} width={site.logo.dark.width} height={site.logo.dark.height} className="ticket__logo" />
          <h1 id="ticket-title" ref={title} tabIndex={-1} className="ticket__status">
            {T.confirmed} <span aria-hidden="true">✓</span>
          </h1>
          <dl className="ticket__rows">
            <div>
              <dt>{T.rows.name}</dt>
              <dd>{saved.name}</dd>
            </div>
            <div>
              <dt>{T.rows.when}</dt>
              <dd>{when}</dd>
            </div>
            <div>
              <dt>{T.rows.guests}</dt>
              <dd>
                {saved.guests} {booking.guests.unit[saved.guests === 1 ? 0 : 1]}
              </dd>
            </div>
            <div>
              <dt>{T.rows.table}</dt>
              <dd>
                {table?.label} · {area?.label}
              </dd>
            </div>
            {saved.occasion !== "none" && (
              <div>
                <dt>{T.rows.occasion}</dt>
                <dd>{occasion?.label}</dd>
              </div>
            )}
          </dl>
        </div>
        <div className="ticket__stub">
          <p className="ticket__code-label">{T.code}</p>
          <p className="ticket__code">{saved.code}</p>
          {/* Placeholder until a QR library is approved: the spiral + code, scannable by eye. */}
          <div className="ticket__qr" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/gira-icone-app-1024.png" alt="" width={1024} height={1024} />
          </div>
          <p className="ticket__door">{T.showAtDoor}</p>
        </div>
      </article>

      <div className="ticket__actions">
        <button type="button" className="btn btn--ghost" onClick={addToCalendar}>
          {T.calendar}
        </button>
        <button type="button" className="btn btn--ghost" onClick={share}>
          {shared ? T.shared : T.share}
        </button>
        <a className="btn btn--primary ticket__preorder" href="/crea-il-tuo">
          {T.preorder} <span aria-hidden="true">→</span>
        </a>
        <a className="btn btn--ghost" href={`${booking.manage.href}?code=${encodeURIComponent(saved.code)}`}>
          {T.manage}
        </a>
      </div>
      {saved.emailSent && saved.email && (
        <p className="ticket__again" role="status">
          {T.emailed(saved.email.trim())}
        </p>
      )}
      <p className="ticket__again">
        <button type="button" onClick={onAnother}>
          {T.another}
        </button>
      </p>
    </div>
  );
}
