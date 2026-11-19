"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { booking } from "@/content/booking";
import { site } from "@/content/site";
import { ApiRequestError, cancelBooking, lookupBooking, sendPreorder } from "@/lib/api";
import { longDate, tableById } from "@/lib/booking";
import { clearCart, removeFromCart, useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/crea";
import { lookupRequest, type BookingDetails, type Preorder } from "@/lib/schemas";

const M = booking.manage;
/** Drop placements that were never set (the builder stores them as optional). */
const placed = (p: Partial<Record<string, { x: number; y: number }>>) =>
  Object.fromEntries(Object.entries(p).filter((e): e is [string, { x: number; y: number }] => !!e[1]));
const messageOf = (ex: unknown) => (ex instanceof ApiRequestError ? ex.message : site.api.generic);

/**
 * "Find or cancel a booking": the booking code and the phone number prove it's yours —
 * no account. Once found, the guest can send their Crea il tuo plates with the booking,
 * or cancel it and free the table.
 */
export function ManageBooking() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ code?: string; phone?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState<BookingDetails | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);

  // Arriving from the ticket or the email: the code is already in the link.
  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get("code");
    if (fromLink) setCode(fromLink.toUpperCase());
  }, []);

  useEffect(() => {
    if (found || cancelled) title.current?.focus();
  }, [found, cancelled]);

  const onLookup = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const check = lookupRequest.safeParse({ code, phone });
    if (!check.success) {
      const next: typeof errors = {};
      for (const issue of check.error.issues) {
        const k = issue.path[0];
        if ((k === "code" || k === "phone") && !next[k]) next[k] = issue.message;
      }
      setErrors(next);
      document.getElementById(next.code ? "manage-code" : "manage-phone")?.focus();
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      setFound(await lookupBooking(check.data.code, check.data.phone));
    } catch (ex) {
      setErrors({ form: messageOf(ex) });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFound(null);
    setCancelled(false);
    setPhone("");
    setErrors({});
  };

  return (
    <div className="book manage">
      <header className="book__head">
        <p className="eyebrow book__eyebrow">{M.eyebrow}</p>
        <h1 className="book__title" ref={title} tabIndex={-1}>
          {cancelled ? M.cancel.done : found ? `${found.name.split(" ")[0]}, ${longDate(found.date)}` : M.title}
        </h1>
        {!found && !cancelled && <p className="book__lead">{M.lead}</p>}
      </header>

      {cancelled ? (
        <section className="book__section manage__actions">
          <Link href="/prenota" className="btn btn--primary">
            {M.cancel.bookAgain}
          </Link>
          <button type="button" className="btn btn--ghost" onClick={reset}>
            {M.lookup.another}
          </button>
        </section>
      ) : found ? (
        <>
          <BookingSummary b={found} />
          {found.upcoming ? (
            <>
              <PreorderPanel
                code={found.code}
                phone={phone}
                saved={found.preorder}
                onSaved={(preorder) => setFound({ ...found, preorder })}
              />
              <CancelPanel code={found.code} phone={phone} onCancelled={() => setCancelled(true)} />
            </>
          ) : (
            <p className="book__section book__hint">{M.past}</p>
          )}
          <p>
            <button type="button" className="btn btn--ghost" onClick={reset}>
              {M.lookup.another}
            </button>
          </p>
        </>
      ) : (
        <form className="book__section" onSubmit={onLookup} noValidate aria-busy={loading || undefined}>
          <div className="details manage__lookup">
            <div className="details__field">
              <label htmlFor="manage-code">{M.lookup.code.label}</label>
              <input
                id="manage-code"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder={M.lookup.code.placeholder}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                aria-invalid={errors.code ? true : undefined}
                aria-describedby={errors.code ? "manage-code-err" : undefined}
              />
              <p id="manage-code-err" className="details__error" aria-live="polite">
                {errors.code}
              </p>
            </div>
            <div className="details__field">
              <label htmlFor="manage-phone">{M.lookup.phone.label}</label>
              <input
                id="manage-phone"
                type="tel"
                autoComplete="tel"
                placeholder={M.lookup.phone.placeholder}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={errors.phone ? "manage-phone-err" : undefined}
              />
              <p id="manage-phone-err" className="details__error" aria-live="polite">
                {errors.phone}
              </p>
            </div>
          </div>
          {errors.form && (
            <p className="book__warn" role="alert">
              {errors.form}
            </p>
          )}
          <p className="manage__actions">
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? M.lookup.searching : M.lookup.submit}
            </button>
          </p>
        </form>
      )}
    </div>
  );
}

function BookingSummary({ b }: { b: BookingDetails }) {
  const table = tableById(b.tableId);
  const area = booking.areas.find((a) => a.id === table?.area);
  const occasion = booking.occasion.options.find((o) => o.id === b.occasion);
  return (
    <section className="book__section" aria-label={booking.ticket.code}>
      <p className="ticket__code-label">{booking.ticket.code}</p>
      <p className="ticket__code">{b.code}</p>
      <dl className="ticket__rows">
        <div>
          <dt>{M.rows.when}</dt>
          <dd>
            {longDate(b.date)} · {b.time}
          </dd>
        </div>
        <div>
          <dt>{M.rows.guests}</dt>
          <dd>
            {b.guests} {booking.guests.unit[b.guests === 1 ? 0 : 1]}
          </dd>
        </div>
        <div>
          <dt>{M.rows.table}</dt>
          <dd>{[table?.label, area?.label].filter(Boolean).join(" · ")}</dd>
        </div>
        {b.occasion !== "none" && (
          <div>
            <dt>{M.rows.occasion}</dt>
            <dd>{occasion?.label}</dd>
          </div>
        )}
        {b.email && (
          <div>
            <dt>{M.rows.email}</dt>
            <dd>{b.email}</dd>
          </div>
        )}
        {b.note && (
          <div>
            <dt>{M.rows.note}</dt>
            <dd>{b.note}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

type PreorderProps = { code: string; phone: string; saved: Preorder | null; onSaved: (p: Preorder) => void };

function PreorderPanel({ code, phone, saved, onSaved }: PreorderProps) {
  const P = M.preorder;
  const cart = useCart();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const estimate = cart.reduce((sum, l) => sum + l.price, 0);

  const send = async () => {
    if (sending || !cart.length) return;
    setSending(true);
    setError("");
    try {
      // Plates only: no prices. The server prices every plate from the menu.
      const items = cart.flatMap(({ selection: s }) => (s.pasta ? [{ ...s, pasta: s.pasta, placements: placed(s.placements) }] : []));
      const preorder = await sendPreorder(code, { phone, items });
      clearCart();
      setSent(true);
      onSaved(preorder);
    } catch (ex) {
      setError(messageOf(ex));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="book__section" aria-labelledby="manage-preorder">
      <h2 id="manage-preorder" className="book__h2">
        {P.title}
      </h2>
      <p className="book__hint">{P.lead}</p>

      {saved && (
        <div className="manage__group">
          <h3 className="manage__h3">{P.saved}</h3>
          <ul className="manage__plates">
            {saved.items.map((it, i) => (
              <li key={i} className="manage__plate">
                <span>
                  <strong>{it.name}</strong>
                  {it.details.length > 0 && <small>{it.details.join(" · ")}</small>}
                </span>
                <span className="tabular-nums">{formatPrice(it.price)}</span>
              </li>
            ))}
          </ul>
          <p className="manage__total">
            <span>{P.total}</span> <strong className="tabular-nums">{formatPrice(saved.total)}</strong>
          </p>
          {sent && (
            <p className="manage__ok" role="status">
              ✓ {P.sent}
            </p>
          )}
        </div>
      )}

      {cart.length > 0 ? (
        <div className="manage__group">
          <h3 className="manage__h3">{P.yourCart}</h3>
          <ul className="manage__plates">
            {cart.map((l) => (
              <li key={l.id} className="manage__plate">
                <span>
                  <strong>{l.name}</strong>
                  {l.details.length > 0 && <small>{l.details.join(" · ")}</small>}
                </span>
                <span className="manage__plate-end">
                  <span className="tabular-nums">{formatPrice(l.price)}</span>
                  <button type="button" className="manage__remove" onClick={() => removeFromCart(l.id)}>
                    {P.remove}
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <p className="manage__total">
            <span>{P.estimate}</span> <strong className="tabular-nums">{formatPrice(estimate)}</strong>
          </p>
          {error && (
            <p className="book__warn" role="alert">
              {error}
            </p>
          )}
          <p className="manage__actions">
            <button type="button" className="btn btn--primary" onClick={send} disabled={sending}>
              {sending ? P.sending : saved ? P.replace(cart.length) : P.send(cart.length)}
            </button>
            <Link href="/crea-il-tuo" className="btn btn--ghost">
              {P.build}
            </Link>
          </p>
        </div>
      ) : (
        <p className="manage__actions">
          {!saved && <span className="book__hint">{P.none}</span>}
          <Link href="/crea-il-tuo" className="btn btn--ghost">
            {P.build}
          </Link>
        </p>
      )}
      <p className="book__hint">{P.payNote}</p>
    </section>
  );
}

function CancelPanel({ code, phone, onCancelled }: { code: string; phone: string; onCancelled: () => void }) {
  const C = M.cancel;
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const cancel = async () => {
    setBusy(true);
    setError("");
    try {
      await cancelBooking(code, phone);
      onCancelled();
    } catch (ex) {
      setError(messageOf(ex));
      setBusy(false);
    }
  };

  return (
    <section className="book__section" aria-labelledby="manage-cancel">
      <h2 id="manage-cancel" className="book__h2">
        {C.title}
      </h2>
      <p className="book__hint">{C.body}</p>
      {error && (
        <p className="book__warn" role="alert">
          {error}
        </p>
      )}
      <p className="manage__actions">
        {confirming ? (
          <>
            <button type="button" className="btn btn--primary" onClick={cancel} disabled={busy}>
              {busy ? C.cancelling : C.confirm}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirming(false)} disabled={busy}>
              {C.keep}
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--ghost" onClick={() => setConfirming(true)}>
            {C.button}
          </button>
        )}
      </p>
    </section>
  );
}
