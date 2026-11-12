"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { welcomeCrea } from "@/content/sections";

const KEY = "gira.welcome-crea.v1";
const read = () => {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const remember = () => {
  try {
    window.localStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* private mode: it simply shows again next visit */
  }
};

/**
 * A small invitation that slides in once the intro has played: "Nuovo · Crea il tuo".
 * Non-modal (never blocks the page), Escape or ✕ closes it, and once dismissed or used it
 * stays away for this visitor. While it shows, the nav's "Crea il tuo" pill pulses.
 */
export function WelcomeCrea() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (read()) return;
    const html = document.documentElement;
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => setOpen(true), welcomeCrea.delayMs);
    };
    // Wait for the preloader hand-off (html[data-loaded]); without a preloader, start now.
    if ("loaded" in html.dataset || !document.querySelector(".preloader")) schedule();
    const mo = new MutationObserver(() => {
      if ("loaded" in html.dataset && !timer) schedule();
    });
    mo.observe(html, { attributes: true, attributeFilter: ["data-loaded"] });

    // Reaching the Crea il tuo section answers the invitation on its own.
    const section = document.getElementById("crea");
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) setOpen(false);
    });
    if (section) io.observe(section);

    return () => {
      window.clearTimeout(timer);
      mo.disconnect();
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-welcome", open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      remember();
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    remember();
    setOpen(false);
  };

  return (
    <aside
      className="welcome-crea"
      data-open={open || undefined}
      aria-label={welcomeCrea.label}
      aria-hidden={!open || undefined}
    >
      <div className="welcome-crea__media" aria-hidden="true">
        <Image src={welcomeCrea.image} alt="" width={1448} height={1086} sizes="112px" />
      </div>
      <div className="welcome-crea__body">
        <p className="welcome-crea__eyebrow">
          <span className="welcome-crea__badge">{welcomeCrea.badge}</span> {welcomeCrea.eyebrow}
        </p>
        <p className="welcome-crea__title">{welcomeCrea.title}</p>
        <p className="welcome-crea__text">{welcomeCrea.text}</p>
        <div className="welcome-crea__actions">
          <a
            className="btn btn--primary welcome-crea__cta"
            href={welcomeCrea.cta.href}
            onClick={remember}
            tabIndex={open ? undefined : -1}
          >
            {welcomeCrea.cta.label} <span aria-hidden="true">→</span>
          </a>
          <button type="button" className="welcome-crea__later" onClick={close} tabIndex={open ? undefined : -1}>
            {welcomeCrea.later}
          </button>
        </div>
      </div>
      <button
        type="button"
        className="welcome-crea__close"
        onClick={close}
        aria-label={welcomeCrea.closeLabel}
        tabIndex={open ? undefined : -1}
      >
        ✕
      </button>
    </aside>
  );
}
