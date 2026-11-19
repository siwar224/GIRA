"use client";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { booking, type Meal } from "@/content/booking";
import { sala } from "@/content/sala";
import { site } from "@/content/site";
import { visit } from "@/content/sections";
import { ApiRequestError, fetchService, staffSession, staffSignIn, staffSignOut } from "@/lib/api";
import { longDate, minutesOf, nextDays, tableById } from "@/lib/booking";
import { zonedNow } from "@/lib/opening-hours";
import type { SalaBooking, SalaService } from "@/lib/schemas";

/**
 * La sala — the team's view of a service. The same room guests choose their table in,
 * seen from the other side: as the time slider moves through the evening, each table
 * lights up with who is sitting there, the occasion, and whether plates were pre-ordered.
 */
export function Sala() {
  const [state, setState] = useState<"checking" | "signedOut" | "signedIn">("checking");

  useEffect(() => {
    staffSession()
      .then(() => setState("signedIn"))
      .catch(() => setState("signedOut"));
  }, []);

  if (state === "checking") return <div className="sala sala--center" aria-busy="true" />;
  if (state === "signedOut") return <SignIn onSignedIn={() => setState("signedIn")} />;
  return <Service onSignedOut={() => setState("signedOut")} />;
}

// ── Sign in ───────────────────────────────────────────────────────────────────

function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const S = sala.signIn;
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError("");
    try {
      await staffSignIn(password);
      onSignedIn();
    } catch (ex) {
      setError(ex instanceof ApiRequestError && ex.status === 401 ? S.error : ex instanceof ApiRequestError ? ex.message : site.api.generic);
      setBusy(false);
    }
  };

  return (
    <div className="sala sala--center">
      <form className="sala-signin" onSubmit={submit} aria-busy={busy || undefined}>
        <p className="sala-signin__eyebrow">{S.eyebrow}</p>
        <h1 className="sala-signin__title">{S.title}</h1>
        <p className="sala-signin__lead">{S.lead}</p>
        <label htmlFor="sala-password">{S.password}</label>
        <input
          id="sala-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "sala-password-err" : undefined}
        />
        <p id="sala-password-err" className="sala-signin__error" role="alert">
          {error}
        </p>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? S.entering : S.submit}
        </button>
      </form>
    </div>
  );
}

// ── The service ───────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");
const toHHMM = (min: number) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;

function shiftDay(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d + days, 12));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Today in Paris, and the meal being served (or next) right now. */
function now(): { today: string; meal: Meal; minutes: number } {
  const { minutes } = zonedNow(visit.timeZone);
  return { today: nextDays(1)[0]!.iso, meal: minutes < booking.meal.lunchBefore * 60 ? "lunch" : "dinner", minutes };
}

function Service({ onSignedOut }: { onSignedOut: () => void }) {
  const initial = useMemo(now, []);
  const [date, setDate] = useState(initial.today);
  const [meal, setMeal] = useState<Meal>(initial.meal);
  const [data, setData] = useState<SalaService | null>(null);
  const [error, setError] = useState(false);
  const [time, setTime] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Load the service, then again every minute (new bookings, cancellations, pre-orders).
  useEffect(() => {
    const ctrl = new AbortController();
    fetchService(date, meal, ctrl.signal)
      .then((d) => {
        setData(d);
        setError(false);
      })
      .catch((ex) => {
        if (ctrl.signal.aborted) return;
        if (ex instanceof ApiRequestError && ex.status === 401) onSignedOut();
        else setError(true);
      });
    return () => ctrl.abort();
  }, [date, meal, tick, onSignedOut]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // A new service opens on "now" when it's today's, otherwise on its first time.
  const ready = data?.date === date && data.meal === meal;
  const slots = useMemo(() => (ready ? data!.slots : []), [ready, data]);
  useEffect(() => {
    if (!ready) return;
    setSelected(null);
    if (date === initial.today) {
      const current = [...slots].reverse().find((s) => minutesOf(s) <= now().minutes);
      setTime(current ?? slots[0] ?? null);
    } else setTime(slots[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, date, meal]);

  const t = time ? minutesOf(time) : null;
  const atTable = useCallback(
    (tableId: string): SalaBooking | null =>
      t === null || !data ? null : (data.bookings.find((b) => b.tableId === tableId && b.startMin <= t && b.endMin > t) ?? null),
    [t, data],
  );
  const chosen = data?.bookings.find((b) => b.code === selected) ?? null;

  const signOut = async () => {
    await staffSignOut().catch(() => undefined);
    onSignedOut();
  };

  const stepTime = (dir: 1 | -1) => {
    const i = time ? slots.indexOf(time) : -1;
    const next = slots[Math.min(slots.length - 1, Math.max(0, i + dir))];
    if (next) setTime(next);
  };

  return (
    <div className="sala">
      <header className="sala__bar">
        <h1 className="sala__title">{sala.title}</h1>

        <div className="sala__meals" role="radiogroup" aria-label="Service">
          {(["lunch", "dinner"] as Meal[]).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={meal === m} className="sala__meal" onClick={() => setMeal(m)}>
              {sala.meals[m]}
            </button>
          ))}
        </div>

        <div className="sala__day">
          <button type="button" className="sala__arrow" aria-label={sala.prevDay} onClick={() => setDate((d) => shiftDay(d, -1))}>
            ‹
          </button>
          <span className="sala__date">{date === initial.today ? `${sala.today} · ${longDate(date)}` : longDate(date)}</span>
          <button type="button" className="sala__arrow" aria-label={sala.nextDay} onClick={() => setDate((d) => shiftDay(d, 1))}>
            ›
          </button>
        </div>

        <p className="sala__live">
          <span aria-hidden="true" /> {sala.service[meal]}
        </p>
        <button type="button" className="sala__signout" onClick={signOut}>
          {sala.signOut}
        </button>
      </header>

      {error && (
        <p className="sala__error" role="alert">
          {sala.errors.load}
        </p>
      )}

      <div className="sala__body">
        <section className="sala__room-wrap" aria-label={`${sala.title}, ${time ?? ""}`}>
          <div className="sala__room" data-meal={meal} style={{ aspectRatio: `${booking.plan.width} / ${booking.plan.height}` }}>
            <Image
              src={booking.plan.image[meal]}
              alt=""
              width={booking.plan.width}
              height={booking.plan.height}
              sizes="(min-width: 1100px) 70vw, 100vw"
              className="sala__plan"
              priority
            />
            {booking.tables.map((table) => {
              const b = atTable(table.id);
              const arriving = !b && t !== null ? data?.bookings.find((x) => x.tableId === table.id && x.startMin > t && x.startMin - t <= 30) : null;
              const w = table.counter ? 11 : booking.tableWidthOnPlan[table.size];
              return (
                <div key={table.id} className="sala__spot" style={{ left: `${table.x}%`, top: `${table.y}%`, width: `${w}%` }}>
                  <button
                    type="button"
                    className={table.counter ? "sala__table sala__table--counter" : "sala__table"}
                    data-state={b ? "seated" : arriving ? "arriving" : "free"}
                    data-selected={(b && b.code === selected) || undefined}
                    disabled={!b && !arriving}
                    aria-label={
                      b
                        ? `${table.label}: ${b.name}, ${b.guests} guests, ${b.time}`
                        : arriving
                          ? `${table.label}: ${sala.table.arriving} ${arriving.time}, ${arriving.name}`
                          : `${table.label}: ${sala.table.free}`
                    }
                    onClick={() => setSelected((b ?? arriving)!.code)}
                  >
                    {!table.counter && (
                      <Image src={booking.scene.table[table.size][meal]} alt="" width={booking.scene.imageSize} height={booking.scene.imageSize} sizes="10vw" />
                    )}
                  </button>
                  {b && <TableCard b={b} below={table.y < 32} />}
                  {arriving && (
                    <span className="sala__soon" data-below={table.y < 32 || undefined}>
                      {arriving.time}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="sala__timeline">
            <button type="button" className="sala__arrow" aria-label="Earlier" onClick={() => stepTime(-1)}>
              ‹
            </button>
            <span className="sala__timeline-label">{sala.time}</span>
            <div className="sala__times" role="radiogroup" aria-label={sala.time}>
              {slots.map((s) => (
                <button key={s} type="button" role="radio" aria-checked={s === time} className="sala__time" onClick={() => setTime(s)}>
                  {s}
                </button>
              ))}
            </div>
            <button type="button" className="sala__arrow" aria-label="Later" onClick={() => stepTime(1)}>
              ›
            </button>
          </div>
        </section>

        <aside className="sala__side">
          {chosen ? (
            <BookingDetail b={chosen} onClose={() => setSelected(null)} />
          ) : (
            <>
              <Panel title={sala.panel.arrivals}>
                {ready && data!.bookings.length === 0 && <p className="sala__muted">{sala.panel.noArrivals}</p>}
                <ul className="sala__list">
                  {data?.bookings.map((b) => (
                    <li key={b.code}>
                      <button
                        type="button"
                        className="sala__row"
                        onClick={() => {
                          setTime(slots.includes(b.time) ? b.time : time);
                          setSelected(b.code);
                        }}
                      >
                        <span className="sala__row-time">{b.time}</span>
                        <span className="sala__row-name">
                          {b.name}
                          <small>
                            {tableById(b.tableId)?.label} · <People n={b.guests} />
                            {b.preorder && <> · <Bowl /></>}
                            {b.occasion !== "none" && <> · {sala.occasions[b.occasion]}</>}
                          </small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel title={sala.panel.waitlist}>
                {ready && data!.waitlist.length === 0 && <p className="sala__muted">{sala.panel.noWaitlist}</p>}
                <ul className="sala__list">
                  {data?.waitlist.map((w, i) => (
                    <li key={`${w.phone}-${i}`} className="sala__waiting">
                      <span className="sala__row-name">
                        {w.name} · <People n={w.guests} />
                        <small>
                          <a href={`tel:${w.phone.replace(/[^\d+]/g, "")}`}>{w.phone}</a>
                          {w.notified && <> · ✓ {sala.panel.told}</>}
                        </small>
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
              <p className="sala__muted sala__refreshed">{sala.refreshed}</p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

// ── Pieces ────────────────────────────────────────────────────────────────────

function TableCard({ b, below }: { b: SalaBooking; below: boolean }) {
  return (
    <span className="sala__card" data-below={below || undefined} aria-hidden="true">
      <strong>{b.name.split(" ").at(-1)}</strong>
      <span>
        <People n={b.guests} />
      </span>
      {b.occasion !== "none" && (
        <span className="sala__card-occasion">
          <OccasionIcon id={b.occasion} /> {sala.occasions[b.occasion]}
        </span>
      )}
      {b.preorder && (
        <span className="sala__card-badge" title={sala.table.preorder}>
          <Bowl />
        </span>
      )}
    </span>
  );
}

function BookingDetail({ b, onClose }: { b: SalaBooking; onClose: () => void }) {
  const table = tableById(b.tableId);
  const area = booking.areas.find((a) => a.id === table?.area);
  return (
    <div className="sala__detail">
      <button type="button" className="sala__close" onClick={onClose}>
        ← {sala.panel.close}
      </button>
      <p className="sala__detail-time">
        {b.time}–{toHHMM(b.endMin)}
      </p>
      <h2 className="sala__detail-name">{b.name}</h2>
      <p className="sala__detail-meta">
        {[table?.label, area?.label].filter(Boolean).join(" · ")} · <People n={b.guests} />
      </p>
      {b.occasion !== "none" && (
        <p className="sala__detail-occasion">
          <OccasionIcon id={b.occasion} /> {sala.occasions[b.occasion]}
        </p>
      )}
      <dl className="sala__detail-rows">
        <div>
          <dt>{sala.panel.phone}</dt>
          <dd>
            <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`}>{b.phone}</a>
          </dd>
        </div>
        {b.note && (
          <div>
            <dt>{sala.panel.note}</dt>
            <dd>“{b.note}”</dd>
          </div>
        )}
      </dl>
      {b.preorder && (
        <Panel title={sala.panel.preorders}>
          <ul className="sala__plates">
            {b.preorder.map((p, i) => (
              <li key={i}>
                <strong>{p.name}</strong>
                {p.details.length > 0 && <small>{p.details.join(" · ")}</small>}
                {p.allergens.length > 0 && <small className="sala__allergens">⚠ {p.allergens.join(", ")}</small>}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="sala__panel">
      <h2 className="sala__panel-title">{title}</h2>
      {children}
    </section>
  );
}

// Small line icons, drawn like the mock-up's: people, cake, heart, case, bowl.
const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
);

function People({ n }: { n: number }) {
  return (
    <span className="sala__people">
      {icon(
        <>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3 19c.8-3.4 3.2-5 6-5s5.2 1.6 6 5" />
          <circle cx="17" cy="9" r="2.4" />
          <path d="M16.5 14.2c2.3.2 3.9 1.6 4.5 4.3" />
        </>,
      )}
      {sala.table.guests(n)}
    </span>
  );
}

function OccasionIcon({ id }: { id: string }) {
  if (id === "birthday")
    return icon(
      <>
        <path d="M4 20h16v-7H4z" />
        <path d="M4 16c2 1 4-1 6 0s4 1 6 0 3-1 4 0" />
        <path d="M8 13v-3M12 13v-3M16 13v-3" />
        <path d="M8 7.5v.01M12 7.5v.01M16 7.5v.01" />
      </>,
    );
  if (id === "anniversary") return icon(<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />);
  return icon(
    <>
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <path d="M9 7V5h6v2" />
    </>,
  );
}

function Bowl() {
  return icon(
    <>
      <path d="M3 12h18a9 9 0 0 1-18 0z" />
      <path d="M8 9c0-2 2-2 2-4M12 9c0-2 2-2 2-4M16 9c0-2 2-2 2-4" />
    </>,
  );
}
