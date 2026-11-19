"use client";
import { useRef, useState, type FormEvent } from "react";
import { booking, type Meal } from "@/content/booking";
import { site } from "@/content/site";
import { ApiRequestError, joinWaitlist } from "@/lib/api";
import { waitlistRequest } from "@/lib/schemas";

type Props = {
  date: string;
  meal: Meal;
  guests: number;
  /** What the guest already typed in the booking form, to save them typing it again. */
  defaults: { name: string; phone: string; email: string };
  /** The server found a table after all (409): reload availability. */
  onTableFree: () => void;
};

/** Shown when a moment is full for the party: leave your details, hear if a table frees up. */
export function WaitlistForm({ date, meal, guests, defaults, onTableFree }: Props) {
  const W = booking.waitlist;
  const D = booking.details;
  const [form, setForm] = useState(defaults);
  const [errors, setErrors] = useState<Partial<Record<"name" | "phone" | "email" | "form", string>>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const mealLabel = booking.meal.options.find((m) => m.id === meal)?.note.toLowerCase() ?? meal;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const input = { date, meal, guests, ...form, website: honeypot.current?.value ?? "" };
    const check = waitlistRequest.safeParse(input);
    if (!check.success) {
      const next: typeof errors = {};
      for (const issue of check.error.issues) {
        const k = issue.path[0];
        if ((k === "name" || k === "phone" || k === "email") && !next[k]) next[k] = issue.message;
      }
      setErrors(next);
      document.getElementById(`wait-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await joinWaitlist(input);
      setDone(true);
    } catch (ex) {
      const apiErr = ex instanceof ApiRequestError ? ex : null;
      setErrors({ form: apiErr?.message ?? site.api.generic });
      if (apiErr?.status === 409) onTableFree();
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <p className="waitlist waitlist--done" role="status">
        ✓ {W.done}
      </p>
    );

  return (
    <form className="waitlist" onSubmit={submit} noValidate aria-busy={busy || undefined}>
      <h3 className="waitlist__title">{W.title}</h3>
      <p className="waitlist__lead">{W.lead(mealLabel)}</p>
      <div className="details">
        {(["name", "phone", "email"] as const).map((k) => (
          <div key={k} className="details__field">
            <label htmlFor={`wait-${k}`}>{D[k].label}</label>
            <input
              id={`wait-${k}`}
              type={k === "email" ? "email" : k === "phone" ? "tel" : "text"}
              autoComplete={k === "name" ? "name" : k === "phone" ? "tel" : "email"}
              placeholder={D[k].placeholder}
              value={form[k]}
              onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
              aria-invalid={errors[k] ? true : undefined}
              aria-describedby={errors[k] ? `wait-${k}-err` : k === "email" ? "wait-email-hint" : undefined}
            />
            <p id={`wait-${k}-err`} className="details__error" aria-live="polite">
              {errors[k]}
            </p>
          </div>
        ))}
      </div>
      <p id="wait-email-hint" className="book__hint">
        {W.emailHint}
      </p>
      <div className="hp" aria-hidden="true">
        <label htmlFor="wait-website">Website</label>
        <input ref={honeypot} id="wait-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      {errors.form && (
        <p className="book__warn" role="alert">
          {errors.form}
        </p>
      )}
      <button type="submit" className="btn btn--primary" disabled={busy}>
        {busy ? W.joining : W.join}
      </button>
    </form>
  );
}
