"use client";
import { useId, useRef, useState, type FormEvent } from "react";
import { visit } from "@/content/sections";
import { site } from "@/content/site";
import { ApiRequestError, subscribeNewsletter } from "@/lib/api";

// Same rule as the server's schema (src/lib/schemas.ts), kept inline so the landing page
// doesn't ship the validation library just for one field.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** "La lettera": validates here, then saves the address through POST /api/newsletter. */
export function Newsletter() {
  const n = visit.newsletter;
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const validate = (value: string) => {
    const v = value.trim();
    if (!v) return n.errors.empty;
    if (!EMAIL_RE.test(v)) return n.errors.invalid;
    return null;
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    const email = input.current?.value ?? "";
    const err = validate(email);
    setError(err);
    if (err) {
      input.current?.focus();
      return;
    }

    setSending(true);
    try {
      await subscribeNewsletter({ email, website: honeypot.current?.value ?? "" });
      setDone(true);
    } catch (ex) {
      const apiErr = ex instanceof ApiRequestError ? ex : null;
      setError(apiErr?.fields.email?.[0] ?? apiErr?.message ?? site.api.generic);
      input.current?.focus();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="newsletter">
      <h3 className="newsletter__title">{n.title}</h3>
      <p className="newsletter__body">{n.body}</p>
      {done ? (
        <p className="newsletter__success" role="status">
          {n.success}
        </p>
      ) : (
        <form className="newsletter__form" onSubmit={onSubmit} noValidate aria-busy={sending || undefined}>
          <label htmlFor={`${id}-email`} className="newsletter__label">
            {n.label}
          </label>
          <div className="newsletter__row">
            <input
              ref={input}
              id={`${id}-email`}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={n.placeholder}
              className="newsletter__input"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : `${id}-hint`}
              onBlur={(e) => error && setError(validate(e.currentTarget.value))}
            />
            <button type="submit" className="btn btn--primary" disabled={sending}>
              {sending ? n.sending : n.submit}
            </button>
          </div>
          {/* Honeypot: hidden from people, filled in by bots. */}
          <div className="hp" aria-hidden="true">
            <label htmlFor={`${id}-website`}>Website</label>
            <input ref={honeypot} id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>
          <p id={`${id}-error`} className="newsletter__error" aria-live="polite">
            {error}
          </p>
          <p id={`${id}-hint`} className="newsletter__hint">
            {n.privacy}
          </p>
        </form>
      )}
    </div>
  );
}
