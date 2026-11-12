"use client";
import { useId, useRef, useState, type FormEvent } from "react";
import { visit } from "@/content/sections";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Front-end only: validates and confirms, nothing is sent. */
export function Newsletter() {
  const n = visit.newsletter;
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const validate = (value: string) => {
    const v = value.trim();
    if (!v) return n.errors.empty;
    if (!EMAIL_RE.test(v)) return n.errors.invalid;
    return null;
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const err = validate(input.current?.value ?? "");
    setError(err);
    if (err) {
      input.current?.focus();
      return;
    }
    setDone(true);
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
        <form className="newsletter__form" onSubmit={onSubmit} noValidate>
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
            <button type="submit" className="btn btn--primary">
              {n.submit}
            </button>
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
