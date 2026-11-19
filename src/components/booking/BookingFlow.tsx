"use client";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { booking, type AreaId, type Meal, type OccasionId } from "@/content/booking";
import { site } from "@/content/site";
import { ApiRequestError, createBooking, fetchAvailability } from "@/lib/api";
import {
  fits,
  longDate,
  mealsFor,
  nextDays,
  slotsFor,
  slotStatus,
  tableById,
  tableSizeFor,
  type BookingState,
  type SavedBooking,
  type TakenFn,
} from "@/lib/booking";
import { bookingRequest, type Availability, type BookingRequestInput } from "@/lib/schemas";
import { TableScene } from "./TableScene";
import { TimeDial } from "./TimeDial";
import { FloorPlan } from "./FloorPlan";
import { Ticket } from "./Ticket";

type ErrorKey = "name" | "phone" | "email" | "note" | "missing" | "server";
const FIELD_KEYS = ["name", "phone", "email", "note"] as const;

function initialState(): BookingState {
  return {
    date: "",
    guests: 2,
    meal: "dinner",
    occasion: "none",
    area: null,
    time: null,
    tableId: null,
    name: "",
    phone: "",
    email: "",
    note: "",
  };
}

/**
 * Book a table: 1 set the table (day, guests, moment, occasion, where) → 2 turn the spiral
 * to a time → 3 pick a real table on the floor plan → 4 details → the ticket.
 * Wide screens show the table scene beside the choices; everything is one page.
 */
export function BookingFlow() {
  const [s, setS] = useState<BookingState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<ErrorKey, string>>>({});
  const [saved, setSaved] = useState<SavedBooking | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const days = useMemo(() => nextDays().map((d) => ({ ...d, open: d.open && mealsFor(d.iso).length > 0 })), []);

  // First open day, and a moment that day actually offers.
  useEffect(() => {
    // Today may have no times left (already past closing) — then start on the next open day.
    const first = days.find((d) => d.open && mealsFor(d.iso).length > 0);
    if (!first) return;
    const meals = mealsFor(first.iso);
    setS((p) => ({ ...p, date: first.iso, meal: meals.includes("dinner") ? "dinner" : (meals[0] ?? "lunch") }));
  }, [days]);

  // ── Live availability for the chosen day (GET /api/availability) ──
  const [avail, setAvail] = useState<Availability | null>(null);
  const [availError, setAvailError] = useState(false);
  const [reload, setReload] = useState(0);
  const refresh = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    if (!s.date) return;
    const ctrl = new AbortController();
    setAvailError(false);
    fetchAvailability(s.date, ctrl.signal)
      .then(setAvail)
      .catch(() => {
        if (!ctrl.signal.aborted) setAvailError(true);
      });
    return () => ctrl.abort();
  }, [s.date, reload]);

  // Coming back to the tab: someone may have booked in the meantime.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  /** Data for the day on screen is in (a refresh keeps showing the previous answer meanwhile). */
  const ready = !!avail && avail.date === s.date;
  const busy = !ready;
  const takenAt = useMemo(() => new Map(avail?.slots.map((x) => [x.time, new Set(x.taken)]) ?? []), [avail]);
  /** Until the server has answered, nothing counts as free; a time it doesn't list can't be booked. */
  const taken: TakenFn = useCallback(
    (tableId, iso, time) => !ready || avail?.date !== iso || (takenAt.get(time)?.has(tableId) ?? true),
    [ready, avail, takenAt],
  );

  const meals = s.date ? mealsFor(s.date) : [];
  const slots = useMemo(
    () =>
      s.date
        ? slotsFor(s.date, s.meal).map((time) => ({
            time,
            status: ready ? slotStatus(s.date, time, s.guests, s.area, taken) : ("available" as const),
          }))
        : [],
    [s.date, s.meal, s.guests, s.area, ready, taken],
  );

  // Fresh data says the chosen table is gone: free the choice and say why.
  useEffect(() => {
    if (saved || !ready || !s.tableId || !s.time || !taken(s.tableId, s.date, s.time)) return;
    setS((p) => ({ ...p, tableId: null }));
    setErrors((e) => ({ ...e, server: booking.details.tableGone }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avail]);
  const table = tableById(s.tableId);
  const size = table?.size ?? tableSizeFor(s.guests);

  /** Update and keep everything consistent: a time that no longer exists or a table that no longer fits is cleared. */
  const set = (patch: Partial<BookingState>) =>
    setS((p) => {
      const n = { ...p, ...patch };
      if (patch.date && !mealsFor(n.date).includes(n.meal)) n.meal = mealsFor(n.date)[0] ?? n.meal;
      if (n.time && !slotsFor(n.date, n.meal).includes(n.time)) n.time = null;
      const t = tableById(n.tableId);
      if (t && (!n.time || !fits(t.size, n.guests) || taken(t.id, n.date, n.time) || (n.area && t.area !== n.area)))
        n.tableId = null;
      return n;
    });

  /** A table chosen on the plan decides "Where to sit" too — the two never disagree. */
  const [areaNote, setAreaNote] = useState("");
  const pickTable = (tableId: string) => {
    const t = tableById(tableId);
    if (!t) return;
    if (s.area && s.area !== t.area) {
      const label = booking.areas.find((a) => a.id === t.area)?.label ?? t.area;
      setAreaNote(booking.plan.switched(label));
    } else setAreaNote("");
    setErrors((e) => ({ ...e, missing: undefined, server: undefined }));
    set({ tableId, area: t.area });
  };
  const chooseArea = (area: AreaId | null) => {
    setAreaNote("");
    set({ area });
  };

  const focusOn = (id: string) => {
    document.getElementById(id)?.focus();
    document.getElementById(id)?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  /** Field messages from a validation failure (browser-side zod, or the server's 422). */
  const fieldErrors = (fields: Record<string, string[] | undefined>) => {
    const out: typeof errors = {};
    for (const k of FIELD_KEYS) if (fields[k]?.[0]) out[k] = fields[k]![0];
    return out;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const input: BookingRequestInput = {
      date: s.date,
      time: s.time ?? "",
      guests: s.guests,
      occasion: s.occasion,
      tableId: s.tableId ?? "",
      name: s.name,
      phone: s.phone,
      email: s.email,
      note: s.note,
      website: honeypot.current?.value ?? "",
    };

    // Same schema as the server: catch the obvious before the round trip.
    const err: typeof errors = {};
    if (!s.time || !s.tableId) err.missing = booking.details.missing;
    const check = bookingRequest.safeParse(input);
    if (!check.success) {
      const byField: Record<string, string[]> = {};
      for (const issue of check.error.issues) (byField[String(issue.path[0])] ??= []).push(issue.message);
      Object.assign(err, fieldErrors(byField));
    }
    setErrors(err);
    if (Object.keys(err).length) {
      focusOn(err.missing ? (s.time ? "book-table" : "book-time") : `book-${Object.keys(err)[0]}`);
      return;
    }

    setSubmitting(true);
    try {
      const confirmed = await createBooking(input);
      setSaved({ ...s, name: confirmed.name, code: confirmed.code, createdAt: Date.parse(confirmed.createdAt) });
      refresh();
      window.scrollTo({ top: 0 });
    } catch (ex) {
      const apiErr = ex instanceof ApiRequestError ? ex : null;
      const fields = apiErr ? fieldErrors(apiErr.fields) : {};
      if (Object.keys(fields).length) {
        setErrors(fields);
        focusOn(`book-${Object.keys(fields)[0]}`);
      } else {
        setErrors({ server: apiErr?.message ?? site.api.generic });
      }
      // Taken in the meantime, or the day/time changed under us: start from fresh data.
      if (apiErr?.status === 409) {
        setS((p) => ({ ...p, tableId: null }));
        focusOn("book-table");
      }
      if (apiErr && (apiErr.status === 409 || apiErr.status === 422)) refresh();
    } finally {
      setSubmitting(false);
    }
  };

  if (saved)
    return (
      <Ticket
        saved={saved}
        onAnother={() => {
          setSaved(null);
          setErrors({});
          setS((p) => ({ ...initialState(), date: p.date, meal: p.meal }));
        }}
      />
    );

  const G = booking.guests;
  const areaPhoto = (id: AreaId) => booking.areas.find((a) => a.id === id)!.photo[s.meal];

  return (
    <form className="book" onSubmit={onSubmit} noValidate>
      <header className="book__head">
        <p className="eyebrow book__eyebrow">{booking.page.eyebrow}</p>
        <h1 className="book__title">{booking.page.title}</h1>
        <p className="book__lead">{booking.page.lead}</p>
      </header>

      {/* ── 1 · Apparecchia la tavola ── */}
      <section className="book__section book__set" aria-labelledby="book-step-1">
        <div className="book__controls">
          <h2 id="book-step-1" className="book__h2">
            <span>1</span> {booking.steps[0].title}
          </h2>

          <fieldset className="field">
            <legend className="field__label">{booking.date.label}</legend>
            <div className="days" role="radiogroup" aria-label={booking.date.label}>
              {days.map((d) => (
                <label key={d.iso} className="day" data-checked={s.date === d.iso || undefined} data-closed={!d.open || undefined}>
                  <input
                    type="radio"
                    name="date"
                    className="sr-only"
                    checked={s.date === d.iso}
                    disabled={!d.open}
                    onChange={() => set({ date: d.iso })}
                  />
                  <span className="day__name">{d.label}</span>
                  <span className="day__num">{d.dayNum}</span>
                  <span className="day__month">{d.open ? d.month : booking.date.closed}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <span className="field__label" id="guests-label">
              {G.label}
            </span>
            <div className="stepper-num" role="group" aria-labelledby="guests-label">
              <button type="button" aria-label="One guest fewer" onClick={() => set({ guests: Math.max(G.min, s.guests - 1) })} disabled={s.guests <= G.min}>
                −
              </button>
              <output aria-live="polite" className="tabular-nums">
                {s.guests} <span>{G.unit[s.guests === 1 ? 0 : 1]}</span>
              </output>
              <button type="button" aria-label="One more guest" onClick={() => set({ guests: Math.min(G.max, s.guests + 1) })} disabled={s.guests >= G.max}>
                +
              </button>
            </div>
            {s.guests >= G.max && <p className="field__hint">{G.more}</p>}
          </div>

          <fieldset className="field">
            <legend className="field__label">{booking.meal.label}</legend>
            <div className="segment-book">
              {booking.meal.options.map((m) => (
                <label key={m.id} className="segment-book__opt" data-checked={s.meal === m.id || undefined} data-off={!meals.includes(m.id) || undefined}>
                  <input
                    type="radio"
                    name="meal"
                    className="sr-only"
                    checked={s.meal === m.id}
                    disabled={!meals.includes(m.id)}
                    onChange={() => set({ meal: m.id as Meal })}
                  />
                  <span aria-hidden="true">{m.id === "lunch" ? "☀" : "☾"}</span> {m.label}
                  <small>{m.note}</small>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="field">
            <legend className="field__label">{booking.occasion.label}</legend>
            <div className="chips">
              {booking.occasion.options.map((o) => (
                <label key={o.id} className="chip" data-checked={s.occasion === o.id || undefined}>
                  <input
                    type="radio"
                    name="occasion"
                    className="sr-only"
                    checked={s.occasion === o.id}
                    onChange={() => set({ occasion: o.id as OccasionId })}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="field">
            <legend className="field__label">Where to sit?</legend>
            <div className="areas">
              <label className="area area--any" data-checked={!s.area || undefined}>
                <input type="radio" name="area" className="sr-only" checked={!s.area} onChange={() => chooseArea(null)} />
                <span className="area__any" aria-hidden="true">✦</span>
                <span className="area__label">{booking.anyArea}</span>
              </label>
              {booking.areas.map((a) => (
                <label key={a.id} className="area" data-checked={s.area === a.id || undefined}>
                  <input type="radio" name="area" className="sr-only" checked={s.area === a.id} onChange={() => chooseArea(a.id)} />
                  <span className="area__media">
                    <Image src={areaPhoto(a.id)} alt="" width={1448} height={1086} sizes="120px" />
                  </span>
                  <span className="area__label">{a.label}</span>
                </label>
              ))}
            </div>
            {areaNote && (
              <p className="field__note" role="status">
                {areaNote}
              </p>
            )}
          </fieldset>
        </div>

        <div className="book__scene">
          <TableScene guests={s.guests} size={size} meal={s.meal} occasion={s.occasion} name={s.name} />
        </div>
      </section>

      {/* ── 2 · Gira ── */}
      <section className="book__section book__time" aria-labelledby="book-step-2">
        <div>
          <h2 id="book-step-2" className="book__h2">
            <span>2</span> {booking.steps[1].title}
          </h2>
          <p className="book__hint">{booking.time.hint}</p>
          {s.date && <p className="book__when">{longDate(s.date)}</p>}
          {ready && slots.length > 0 && slots.every((x) => x.status === "full") && <p className="book__warn">{booking.time.none}</p>}
          {availError ? (
            <div role="alert">
              <p className="book__warn">{booking.time.loadError}</p>
              <button type="button" className="btn btn--ghost book__retry" onClick={refresh}>
                {booking.time.retry}
              </button>
            </div>
          ) : (
            busy && (
              <p className="book__hint" role="status">
                {booking.time.checking}
              </p>
            )
          )}
        </div>
        <div id="book-time" tabIndex={-1}>
          <TimeDial slots={slots} value={s.time} onChange={(time) => set({ time })} label={booking.time.label} busy={busy} />
        </div>
      </section>

      {/* ── 3 · Il tavolo ── */}
      <section className="book__section book__plan" aria-labelledby="book-step-3">
        <h2 id="book-step-3" className="book__h2">
          <span>3</span> {booking.steps[2].title}
        </h2>
        <p className="book__hint">{booking.plan.hint}</p>
        <div id="book-table" tabIndex={-1}>
          <FloorPlan
            meal={s.meal}
            time={s.time}
            isTaken={(tableId) => !!s.time && taken(tableId, s.date, s.time)}
            busy={busy}
            guests={s.guests}
            area={s.area}
            value={s.tableId}
            onChange={pickTable}
            onShowAll={() => set({ area: null })}
          />
        </div>
      </section>

      {/* ── 4 · Details ── */}
      <section className="book__section book__details" aria-labelledby="book-step-4">
        <h2 id="book-step-4" className="book__h2">
          <span>4</span> {booking.steps[3].title}
        </h2>
        <div className="details">
          {(["name", "phone", "email"] as const).map((k) => {
            const f = booking.details[k];
            return (
              <div key={k} className="details__field">
                <label htmlFor={`book-${k}`}>{f.label}</label>
                <input
                  id={`book-${k}`}
                  type={k === "email" ? "email" : k === "phone" ? "tel" : "text"}
                  autoComplete={k === "name" ? "name" : k === "phone" ? "tel" : "email"}
                  placeholder={f.placeholder}
                  value={s[k]}
                  onChange={(e) => set({ [k]: e.target.value })}
                  aria-invalid={errors[k] ? true : undefined}
                  aria-describedby={errors[k] ? `book-${k}-err` : undefined}
                />
                <p id={`book-${k}-err`} className="details__error" aria-live="polite">
                  {errors[k]}
                </p>
              </div>
            );
          })}
          <div className="details__field details__field--wide">
            <label htmlFor="book-note">{booking.details.note.label}</label>
            <textarea
              id="book-note"
              rows={2}
              maxLength={booking.details.note.max}
              placeholder={booking.details.note.placeholder}
              value={s.note}
              onChange={(e) => set({ note: e.target.value })}
              aria-invalid={errors.note ? true : undefined}
              aria-describedby={errors.note ? "book-note-err" : undefined}
            />
            {errors.note && (
              <p id="book-note-err" className="details__error" aria-live="polite">
                {errors.note}
              </p>
            )}
          </div>
          {/* Honeypot: hidden from people, filled in by bots; the server refuses it when it isn't empty. */}
          <div className="hp" aria-hidden="true">
            <label htmlFor="book-website">Website</label>
            <input ref={honeypot} id="book-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>
        </div>
      </section>

      {/* ── Summary bar ── */}
      <div className="book__bar">
        <p className="book__summary">
          <strong>{booking.summary.title}</strong>
          <span>
            {s.guests} {G.unit[s.guests === 1 ? 0 : 1]}
            {s.date && ` · ${longDate(s.date)}`}
            {s.time ? ` · ${s.time}` : ` · ${booking.summary.empty}`}
            {table && ` · ${table.label}`}
          </span>
        </p>
        {(errors.missing || errors.server) && (
          <p className="book__missing" role="alert">
            {errors.missing ?? errors.server}
          </p>
        )}
        <button type="submit" className="btn btn--primary book__confirm" disabled={submitting} aria-busy={submitting || undefined}>
          {submitting ? booking.details.confirming : booking.details.confirm}
        </button>
      </div>
    </form>
  );
}
