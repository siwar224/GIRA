"use client";
import { useEffect, useState } from "react";
import { visit } from "@/content/sections";
import { openStatus, zonedNow, type OpenStatus } from "@/lib/opening-hours";

/** Live "Open now / Closed" badge computed in the restaurant's time zone. Rendered after mount (no hydration mismatch). */
export function OpenBadge() {
  const [status, setStatus] = useState<OpenStatus | null>(null);

  useEffect(() => {
    const tick = () => setStatus(openStatus(visit.hours, visit.timeZone));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const b = visit.badge;
  let text = " ";
  if (status?.open) text = `${b.open} · ${b.closesAt} ${status.until}`;
  else if (status) {
    const n = status.next;
    const when = !n
      ? ""
      : n.inDays === 0
        ? `${b.today} ${n.at}`
        : n.inDays === 1
          ? `${b.tomorrow} ${n.at}`
          : `${b.on} ${visit.hours.find((h) => h.day === n.day)?.label ?? ""} ${b.at} ${n.at}`;
    text = n ? `${b.closed} · ${b.opensAt} ${when}` : b.closed;
  }

  return (
    <p className="open-badge" data-open={status?.open || undefined} data-ready={status ? "" : undefined} role="status">
      <span className="open-badge__dot" aria-hidden="true" />
      <span>{text}</span>
    </p>
  );
}

/** Today's row in the hours table, highlighted in the restaurant's time zone. */
export function useTodayInZone(): number | null {
  const [day, setDay] = useState<number | null>(null);
  useEffect(() => setDay(zonedNow(visit.timeZone).day), []);
  return day;
}
