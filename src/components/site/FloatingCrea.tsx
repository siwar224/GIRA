"use client";
import { useEffect, useState } from "react";
import { site } from "@/content/site";

/**
 * Phones only (CSS): a floating "Crea il tuo" shortcut. It appears once the hero has scrolled
 * away and steps aside while the Crea il tuo teaser or the footer is on screen.
 */
export function FloatingCrea() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hero = document.querySelector(".hero");
    const blockers = [document.getElementById("crea"), document.getElementById("visit")].filter(
      (el): el is HTMLElement => !!el,
    );
    const state = { heroVisible: true, blocked: new Set<Element>() };
    const update = () => setShow(!state.heroVisible && state.blocked.size === 0);

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) state.heroVisible = e.isIntersecting;
        else if (e.isIntersecting) state.blocked.add(e.target);
        else state.blocked.delete(e.target);
      }
      update();
    });
    if (hero) io.observe(hero);
    blockers.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <a
      className="floating-crea"
      href={site.floatingCrea.href}
      data-show={show || undefined}
      aria-hidden={!show || undefined}
      tabIndex={show ? undefined : -1}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/gira-icone-creme.png" alt="" width={960} height={960} />
      {site.floatingCrea.label}
    </a>
  );
}
